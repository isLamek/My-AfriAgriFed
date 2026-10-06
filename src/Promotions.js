import React, { useEffect, useState } from "react";
import {
  addDoc,
  collection,

  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "./firebaseConfig";
import { useAccount } from "./AccountContext";
import { promotionsLabelFor } from "./navConfig";
import { uploadToCloudinary } from "./cloudinaryUpload";
import { startPromotionCheckout } from "./payments";
import { RATE_PER_WORKING_DAY, countWorkingDays } from "./promoPricing";
import { logTelemetryEvent, TELEMETRY_EVENTS } from "./telemetry";
import toast from "react-hot-toast";
import InsightsFrame from "./InsightsFrame";

const emptyPromo = { productName: "", description: "", startDate: "", endDate: "" };

// Local calendar date (Namibia is UTC+2; toISOString would give yesterday's
// date for the first two hours of every day).
function todayIso() {
  const now = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

function isActive(promo) {
  const today = todayIso();
  return (!promo.startDate || promo.startDate <= today) && (!promo.endDate || promo.endDate >= today);
}

export default function Promotions() {
  const [promotions, setPromotions] = useState([]);
  const [formData, setFormData] = useState(emptyPromo);
  const [imageFile, setImageFile] = useState(null);
  const { userType, user: account, sellerName, publicName } = useAccount();
  const navigate = useNavigate();
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const promoQuery = query(collection(db, "promotions"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(promoQuery, (snapshot) => {
      setPromotions(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const workingDays = countWorkingDays(formData.startDate, formData.endDate);
  const cost = workingDays * RATE_PER_WORKING_DAY;

  const postPromotion = async (event) => {
    event.preventDefault();

    if (!formData.productName.trim()) {
      toast.error("Please add a product name.");
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      toast.error("Pick a start and end date.");
      return;
    }
    if (formData.startDate < todayIso()) {
      toast.error("The start date can't be in the past.");
      return;
    }
    if (formData.endDate < formData.startDate) {
      toast.error("The end date must be on or after the start date.");
      return;
    }
    if (workingDays === 0) {
      toast.error("Those dates fall on a weekend. Pick at least one working day.");
      return;
    }

    setPosting(true);

    try {
      const user = account;
      let imageUrl = "";

      if (imageFile) {
        const upload = await uploadToCloudinary(imageFile, "promotions");
        imageUrl = upload.secure_url;
      }

      const docRef = await addDoc(collection(db, "promotions"), {
        ...formData,
        imageUrl,
        farmerId: user?.uid || "",
        farmerName: sellerName || publicName,
        workingDays,
        cost,
        status: "pending_payment",
        createdAt: serverTimestamp(),
      });

      logTelemetryEvent(TELEMETRY_EVENTS.PROMOTION_CREATED, { productName: formData.productName, cost });

      toast("Redirecting to payment to activate your promotion...");
      // The server works the price out from the saved dates; `cost` above is only a preview.
      await startPromotionCheckout({
        promotionId: docRef.id,
        description: `Promotion: ${formData.productName} (${workingDays} working day${workingDays > 1 ? "s" : ""})`,
      });
    } catch (error) {
      console.error(error);
      toast.error("Could not create promotion: " + error.message);
    } finally {
      setPosting(false);
    }
  };

  const activePromotions = promotions.filter((promo) => promo.status !== "pending_payment" && isActive(promo));
  // Buyers see deals running now; a producer also sees their own (paid or not, past or future).
  const visiblePromotions = promotions.filter(
    (promo) => (promo.status !== "pending_payment" && isActive(promo)) || promo.farmerId === account?.uid
  );
  const canPost = userType === "farmer";

  return (
    <InsightsFrame
      title={promotionsLabelFor(userType)}
      subtitle={
        canPost
          ? "Put a product at the top of everyone's Deals page for the days you choose."
          : "Products producers are featuring right now."
      }
      activePath="/promotions"
    >
      <div className="promo-ticker" aria-label="Active promotions">
        {activePromotions.length === 0 ? (
          <p className="insight-empty" style={{ padding: "0 1rem" }}>No active promotions right now.</p>
        ) : (
          <div className="promo-ticker-track">
            {[...activePromotions, ...activePromotions].map((promo, index) => (
              <div className="promo-ticker-item" key={`${promo.id}-${index}`} aria-hidden={index >= activePromotions.length}>
                {promo.imageUrl && <img src={promo.imageUrl} alt="" />}
                <span>
                  <strong>{promo.productName}</strong> · {promo.farmerName}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="promo-layout">
        {canPost && (
          <section className="aaf-card">
            <h2 style={{ margin: "0 0 4px", fontSize: "1.05rem" }}>New promotion</h2>
            <p className="insight-foot" style={{ margin: "0 0 12px" }}>
              N${RATE_PER_WORKING_DAY} per working day (weekends are free). You pay once, by card, before it goes live. Make
              sure the product is also listed in My listings so buyers can order it.
            </p>
            <form className="promo-form" onSubmit={postPromotion}>
              <label>
                Product name
                <input name="productName" value={formData.productName} onChange={handleChange} maxLength={80} />
              </label>
              <label>
                Description
                <textarea name="description" value={formData.description} onChange={handleChange} rows="3" maxLength={400} />
              </label>
              <div className="promo-form-row">
                <label>
                  Start date
                  <input type="date" name="startDate" min={todayIso()} value={formData.startDate} onChange={handleChange} />
                </label>
                <label>
                  End date
                  <input type="date" name="endDate" min={formData.startDate || todayIso()} value={formData.endDate} onChange={handleChange} />
                </label>
              </div>
              <label>
                Photo (optional)
                <input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0])} />
              </label>
              {workingDays > 0 && (
                <p className="promo-cost">
                  {workingDays} working day{workingDays > 1 ? "s" : ""} · N${cost} total
                </p>
              )}
              <button className="aaf-btn aaf-btn-primary" disabled={posting}>
                {posting ? "Posting..." : `Pay N$${cost || 0} & post promotion`}
              </button>
            </form>
          </section>
        )}

        <section className="promo-list">
          {visiblePromotions.length === 0 ? (
            <p className="insight-empty">{canPost ? "You have no promotions yet." : "No deals running right now."}</p>
          ) : (
            visiblePromotions.map((promo) => (
              <article className="aaf-card promo-card" key={promo.id}>
                {promo.imageUrl && <img src={promo.imageUrl} alt={promo.productName} />}
                <div>
                  <h3>{promo.productName}</h3>
                  {promo.description && <p>{promo.description}</p>}
                  <p className="promo-meta">
                    {promo.startDate || "-"} to {promo.endDate || "-"} ·{" "}
                    {promo.status === "pending_payment" ? "Awaiting payment" : isActive(promo) ? "Active" : "Expired"}
                  </p>
                  <p className="promo-meta">By {promo.farmerName && !promo.farmerName.includes("@") ? promo.farmerName : "a producer"}</p>
                  {account && promo.farmerId !== account.uid && (
                    <button
                      type="button"
                      className="aaf-text-btn"
                      onClick={() => navigate(`/marketplace?q=${encodeURIComponent(promo.productName || "")}`)}
                    >
                      Find it in the Marketplace
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </InsightsFrame>
  );
}
