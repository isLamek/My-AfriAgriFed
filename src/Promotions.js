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
import { useNavigate } from "react-router-dom";
import { auth, db } from "./firebaseConfig";
import { uploadToCloudinary } from "./cloudinairyUpload";
import { logTelemetryEvent, TELEMETRY_EVENTS } from "./telemetry";
import toast from "react-hot-toast";
import "./DataDashboards.css";

const emptyPromo = { productName: "", description: "", startDate: "", endDate: "" };

function isActive(promo) {
  const today = new Date().toISOString().slice(0, 10);
  return (!promo.startDate || promo.startDate <= today) && (!promo.endDate || promo.endDate >= today);
}

export default function Promotions() {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState([]);
  const [formData, setFormData] = useState(emptyPromo);
  const [imageFile, setImageFile] = useState(null);
  const [userType, setUserType] = useState(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const loadUserType = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const snap = await getDoc(doc(db, "users", uid));
      setUserType(snap.exists() ? snap.data().userType : null);
    };

    loadUserType();
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

  const postPromotion = async (event) => {
    event.preventDefault();

    if (!formData.productName.trim()) {
      toast.error("Please add a product name.");
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

      await addDoc(collection(db, "promotions"), {
        ...formData,
        imageUrl,
        farmerId: user?.uid || "",
        farmerName: user?.displayName || user?.email || "Farmer",
        createdAt: serverTimestamp(),
      });

      logTelemetryEvent(TELEMETRY_EVENTS.PROMOTION_CREATED, { productName: formData.productName });
      setFormData(emptyPromo);
      setImageFile(null);
    } catch (error) {
      console.error(error);
      toast.error("Could not create promotion: " + error.message);
    } finally {
      setPosting(false);
    }
  };

  const activePromotions = promotions.filter(isActive);
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
              <button disabled={posting}>{posting ? "Posting..." : "Post Promotion"}</button>
            </form>
          </section>
        )}

        <section className="promotion-list">
          {promotions.length === 0 ? (
            <p className="empty-state">No promotions yet.</p>
          ) : (
            promotions.map((promo) => (
              <article className="promotion-card" key={promo.id}>
                {promo.imageUrl && <img src={promo.imageUrl} alt={promo.productName} />}
                <div>
                  <h3>{promo.productName}</h3>
                  <p>{promo.description}</p>
                  <p className="promotion-dates">
                    {promo.startDate || "—"} to {promo.endDate || "—"} · {isActive(promo) ? "Active" : "Expired"}
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
