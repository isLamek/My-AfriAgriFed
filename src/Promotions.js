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
import { auth, db } from "./firebaseConfig";
import { uploadToCloudinary } from "./cloudinairyUpload";
import { startPromotionCheckout } from "./payments";
import { RATE_PER_WORKING_DAY, countWorkingDays } from "./promoPricing";
import { logTelemetryEvent, TELEMETRY_EVENTS } from "./telemetry";
import toast from "react-hot-toast";
import InsightsFrame from "./InsightsFrame";
import { t, tIn, formatNumber } from "./i18n";

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
      toast.error(t("promotions.pleaseAddProductName"));
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      toast.error(t("promotions.pickStartAndEndDate"));
      return;
    }
    if (formData.startDate < todayIso()) {
      toast.error(t("promotions.theStartDateCanBeIn"));
      return;
    }
    if (formData.endDate < formData.startDate) {
      toast.error(t("promotions.theEndDateMustBeOn"));
      return;
    }
    if (workingDays === 0) {
      toast.error(t("promotions.thoseDatesFallOnWeekendPick"));
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

      toast(t("promotions.redirectingToPaymentToActivateYour"));
      // The server works the price out from the saved dates; `cost` above is only a preview.
      await startPromotionCheckout({
        promotionId: docRef.id,
        description: tIn("en", "promotions.paymentDescription", { product: formData.productName, count: workingDays }),
      });
    } catch (error) {
      console.error(error);
      toast.error(t("promotions.couldNotCreate", { error: error.message }));
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
    <InsightsFrame
      eyebrow={t("promotions.visibleToProducersConsumersInstitutions")}
      title={t("promotions.promotions")}
      subtitle={t("promotions.farmersSpotlightProductsHereToReach")}
      activePath="/promotions"
    >
      <div className="promo-ticker" aria-label={t("promotions.activePromotions")}>
        {activePromotions.length === 0 ? (
          <p className="insight-empty" style={{ padding: "0 1rem" }}>{t("promotions.noActivePromotionsRightNow")}</p>
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
            <h2 style={{ margin: "0 0 4px", fontSize: "1.05rem" }}>{t("promotions.promoteProduct")}</h2>
            <p className="insight-foot" style={{ margin: "0 0 12px" }}>
              {t("promotions.ratePerDay", { price: `N$${formatNumber(RATE_PER_WORKING_DAY)}` })}
            </p>
            <form className="promo-form" onSubmit={postPromotion}>
              <label>
                {t("promotions.productName")}
                <input name="productName" value={formData.productName} onChange={handleChange} maxLength={80} />
              </label>
              <label>
                {t("promotions.description")}
                <textarea name="description" value={formData.description} onChange={handleChange} rows="3" maxLength={400} />
              </label>
              <div className="promo-form-row">
                <label>
                  {t("promotions.startDate")}
                  <input type="date" name="startDate" min={todayIso()} value={formData.startDate} onChange={handleChange} />
                </label>
                <label>
                  {t("promotions.endDate")}
                  <input type="date" name="endDate" min={formData.startDate || todayIso()} value={formData.endDate} onChange={handleChange} />
                </label>
              </div>
              <label>
                {t("promotions.photoOptional")}
                <input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0])} />
              </label>
              {workingDays > 0 && (
                <p className="promo-cost">
                  {t("promotions.costSummary", { count: workingDays, total: `N$${formatNumber(cost)}` })}
                </p>
              )}
              <button className="aaf-btn aaf-btn-primary" disabled={posting}>
                {posting ? t("promotions.posting") : t("promotions.payAndPost", { total: `N$${formatNumber(cost || 0)}` })}
              </button>
            </form>
          </section>
        )}

        <section className="promo-list">
          {visiblePromotions.length === 0 ? (
            <p className="insight-empty">{t("promotions.noPromotionsYet")}</p>
          ) : (
            visiblePromotions.map((promo) => (
              <article className="aaf-card promo-card" key={promo.id}>
                {promo.imageUrl && <img src={promo.imageUrl} alt={promo.productName} />}
                <div>
                  <h3>{promo.productName}</h3>
                  {promo.description && <p>{promo.description}</p>}
                  <p className="promo-meta">
                    {t("promotions.dateRange", { start: promo.startDate || "-", end: promo.endDate || "-" })} ·{" "}
                    {promo.status === "pending_payment" ? t("promotions.awaitingPayment") : isActive(promo) ? t("promotions.active") : t("promotions.expired")}
                  </p>
                  <p className="promo-meta">{t("promotions.by", { name: promo.farmerName })}</p>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </InsightsFrame>
  );
}
