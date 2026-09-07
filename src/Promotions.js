import React, { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth, db } from "./firebaseConfig";
import { uploadToCloudinary } from "./cloudinairyUpload";
import { startPlatformCheckout } from "./payments";
import { logTelemetryEvent, TELEMETRY_EVENTS } from "./telemetry";
import toast from "react-hot-toast";
import "./DataDashboards.css";

const RATE_PER_WORKING_DAY = 30; // N$/working day, per the concept note's financial model

const emptyPromo = { productName: "", description: "", startDate: "", endDate: "" };

function isActive(promo) {
  const today = new Date().toISOString().slice(0, 10);
  return (!promo.startDate || promo.startDate <= today) && (!promo.endDate || promo.endDate >= today);
}

// Excludes weekends, per "N$30/working day (excluding weekends and public
// holidays)" - a public-holiday calendar is out of scope, so this is a
// deliberate simplification.
function countWorkingDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;

  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export default function Promotions() {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState([]);
  const [formData, setFormData] = useState(emptyPromo);
  const [imageFile, setImageFile] = useState(null);
  const [userType, setUserType] = useState(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    // onAuthStateChanged (not auth.currentUser, which can still be null right
    // after a fresh page load/refresh while the session restores) so this
    // reliably fires once the signed-in user is actually known.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const snap = await getDoc(doc(db, "users", user.uid));
      setUserType(snap.exists() ? snap.data().userType : null);
    });

    return () => unsubscribe();
  }, []);

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

    if (!formData.startDate || !formData.endDate || workingDays === 0) {
      toast.error("Pick a start and end date covering at least one working day.");
      return;
    }

    setPosting(true);

    try {
      const user = auth.currentUser;
      let imageUrl = "";

      if (imageFile) {
        const upload = await uploadToCloudinary(imageFile, "promotions");
        imageUrl = upload.secure_url;
      }

      const docRef = await addDoc(collection(db, "promotions"), {
        ...formData,
        imageUrl,
        farmerId: user?.uid || "",
        farmerName: user?.displayName || user?.email || "Farmer",
        workingDays,
        cost,
        status: "pending_payment",
        createdAt: serverTimestamp(),
      });

      logTelemetryEvent(TELEMETRY_EVENTS.PROMOTION_CREATED, { productName: formData.productName, cost });

      toast("Redirecting to payment to activate your promotion...");
      await startPlatformCheckout({
        description: `Promotion: ${formData.productName} (${workingDays} working day${workingDays > 1 ? "s" : ""})`,
        amount: cost,
        purpose: "promotion",
        refId: docRef.id,
      });
    } catch (error) {
      console.error(error);
      toast.error("Could not create promotion: " + error.message);
    } finally {
      setPosting(false);
    }
  };

  const activePromotions = promotions.filter((promo) => promo.status !== "pending_payment" && isActive(promo));
  const visiblePromotions = promotions.filter(
    (promo) => promo.status !== "pending_payment" || promo.farmerId === auth.currentUser?.uid
  );
  const canPost = userType === "farmer";

  return (
    <div className="promotions-page">
      <header className="promotions-header">
        <div>
          <p className="eyebrow">Visible to producers, consumers &amp; institutions</p>
          <h1>Promotions</h1>
          <p>Farmers spotlight products here to reach preferential customers.</p>
        </div>
        <button onClick={() => navigate(-1)}>Back</button>
      </header>

      <div className="promotions-ticker">
        {activePromotions.length === 0 ? (
          <p className="empty-state" style={{ padding: "0 1.5rem" }}>No active promotions right now.</p>
        ) : (
          <div className="promotions-ticker-track">
            {[...activePromotions, ...activePromotions].map((promo, index) => (
              <div className="ticker-item" key={`${promo.id}-${index}`}>
                {promo.imageUrl && <img src={promo.imageUrl} alt={promo.productName} />}
                <span>
                  <strong>{promo.productName}</strong> — {promo.farmerName}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <main className="promotions-layout">
        {canPost && (
          <section className="promotion-form-card">
            <h2>Promote a Product</h2>
            <p className="promotion-pricing-note">N${RATE_PER_WORKING_DAY} per working day (weekends excluded).</p>
            <form onSubmit={postPromotion}>
              <label>
                Product name
                <input name="productName" value={formData.productName} onChange={handleChange} />
              </label>
              <label>
                Description
                <textarea name="description" value={formData.description} onChange={handleChange} rows="3" />
              </label>
              <div className="promotion-form-row">
                <label>
                  Start date
                  <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} />
                </label>
                <label>
                  End date
                  <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} />
                </label>
              </div>
              <label>
                Photo
                <input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0])} />
              </label>
              {workingDays > 0 && (
                <p className="promotion-cost-preview">
                  {workingDays} working day{workingDays > 1 ? "s" : ""} · N${cost} total
                </p>
              )}
              <button disabled={posting}>{posting ? "Posting..." : `Pay N$${cost || 0} & Post Promotion`}</button>
            </form>
          </section>
        )}

        <section className="promotion-list">
          {visiblePromotions.length === 0 ? (
            <p className="empty-state">No promotions yet.</p>
          ) : (
            visiblePromotions.map((promo) => (
              <article className="promotion-card" key={promo.id}>
                {promo.imageUrl && <img src={promo.imageUrl} alt={promo.productName} />}
                <div>
                  <h3>{promo.productName}</h3>
                  <p>{promo.description}</p>
                  <p className="promotion-dates">
                    {promo.startDate || "—"} to {promo.endDate || "—"} ·{" "}
                    {promo.status === "pending_payment" ? "Awaiting payment" : isActive(promo) ? "Active" : "Expired"}
                  </p>
                  <p className="promotion-dates">By {promo.farmerName}</p>
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
