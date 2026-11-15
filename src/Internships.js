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
  updateDoc,
} from "firebase/firestore";
import { MapPin } from "lucide-react";
import { auth, db } from "./firebaseConfig";
import { notifyUser } from "./notifications";
import { logTelemetryEvent, TELEMETRY_EVENTS } from "./telemetry";
import toast from "react-hot-toast";
import InsightsFrame from "./InsightsFrame";
import "./Internships.css";
import { t } from "./i18n";

const emptyForm = { title: "", description: "", location: "", slots: 1 };

export default function Internships() {
  const [userType, setUserType] = useState(null);
  const [internships, setInternships] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
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
    const internshipsQuery = query(collection(db, "internships"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(internshipsQuery, (snapshot) => {
      setInternships(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });

    return () => unsubscribe();
  }, []);

  const canPost = userType === "farmer" || userType === "institution";
  const postType = userType === "farmer" ? "offer" : "request";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const postInternship = async (event) => {
    event.preventDefault();

    if (!formData.title.trim()) {
      toast.error(t("internships.pleaseAddTitle"));
      return;
    }

    setPosting(true);

    try {
      const user = auth.currentUser;

      await addDoc(collection(db, "internships"), {
        ...formData,
        type: postType,
        postedByRole: userType,
        postedById: user?.uid || "",
        postedByName: user?.displayName || user?.email || userType,
        postedByEmail: user?.email || "",
        status: "open",
        createdAt: serverTimestamp(),
      });

      logTelemetryEvent(TELEMETRY_EVENTS.INTERNSHIP_POSTED, { type: postType, title: formData.title });
      setFormData(emptyForm);
    } catch (error) {
      console.error(error);
      toast.error(t("internships.couldNotPost", { error: error.message }));
    } finally {
      setPosting(false);
    }
  };

  // Institution requesting a placement -> farmer approves in one step.
  const approveRequestAsFarmer = async (item) => {
    const user = auth.currentUser;

    await updateDoc(doc(db, "internships", item.id), {
      status: "approved",
      approvedById: user?.uid || "",
      approvedByName: user?.displayName || user?.email || "Farmer",
      approvedAt: serverTimestamp(),
    });

    await notifyUser(item.postedById, {
      key: "notif.internship.approved",
      params: { name: user?.displayName || t("internships.aFarmer"), item: item.title },
      link: "/internships",
    });

    logTelemetryEvent(TELEMETRY_EVENTS.INTERNSHIP_STATUS_CHANGED, { id: item.id, status: "approved" });
  };

  // Institution claims a farmer's offer -> farmer approves afterwards.
  const claimOfferAsInstitution = async (item) => {
    const user = auth.currentUser;

    await updateDoc(doc(db, "internships", item.id), {
      status: "claimed",
      claimedById: user?.uid || "",
      claimedByName: user?.displayName || user?.email || "Institution",
      claimedAt: serverTimestamp(),
    });

    await notifyUser(item.postedById, {
      key: "notif.internship.claimed",
      params: { name: user?.displayName || t("internships.anInstitution"), item: item.title },
      link: "/internships",
    });

    logTelemetryEvent(TELEMETRY_EVENTS.INTERNSHIP_STATUS_CHANGED, { id: item.id, status: "claimed" });
  };

  const approveClaimAsFarmer = async (item) => {
    const user = auth.currentUser;

    await updateDoc(doc(db, "internships", item.id), {
      status: "approved",
      approvedById: user?.uid || "",
      approvedByName: user?.displayName || user?.email || "Farmer",
      approvedAt: serverTimestamp(),
    });

    await notifyUser(item.claimedById, {
      key: "notif.internship.placement",
      params: { item: item.title },
      link: "/internships",
    });

    logTelemetryEvent(TELEMETRY_EVENTS.INTERNSHIP_STATUS_CHANGED, { id: item.id, status: "approved" });
  };

  const closeListing = async (item) => {
    await updateDoc(doc(db, "internships", item.id), { status: "closed" });
    logTelemetryEvent(TELEMETRY_EVENTS.INTERNSHIP_STATUS_CHANGED, { id: item.id, status: "closed" });
  };

  const renderActions = (item) => {
    const uid = auth.currentUser?.uid;
    const isOwner = item.postedById === uid;

    if (item.status === "closed") return <span className="status-pill closed">{t("internships.closed")}</span>;

    if (item.status === "open") {
      if (item.type === "request" && userType === "farmer") {
        return <button onClick={() => approveRequestAsFarmer(item)}>{t("internships.offerApprove")}</button>;
      }
      if (item.type === "offer" && userType === "institution") {
        return <button onClick={() => claimOfferAsInstitution(item)}>{t("internships.requestPlacement")}</button>;
      }
      if (isOwner) {
        return <button className="ghost-btn" onClick={() => closeListing(item)}>{t("common.close")}</button>;
      }
      return <span className="status-pill open">{t("internships.open")}</span>;
    }

    if (item.status === "claimed") {
      if (isOwner && userType === "farmer") {
        return <button onClick={() => approveClaimAsFarmer(item)}>{t("internships.approveName", { name: item.claimedByName })}</button>;
      }
      return <span className="status-pill pending">{t("internships.pendingFarmerApproval")}</span>;
    }

    if (item.status === "approved") {
      return <span className="status-pill approved">{t("internships.approved")}</span>;
    }

    return null;
  };

  return (
    <InsightsFrame
      eyebrow={t("internships.producersInstitutions")}
      title={t("internships.internships")}
      subtitle={t("internships.farmersOfferPlacementsInstitutionsRequestThe")}
      activePath="/internships"
    >
      <main className="internships-layout">
        {canPost && (
          <section className="internships-form-card">
            <h2>{postType === "offer" ? t("internships.offerAnInternship") : t("internships.requestAnInternship")}</h2>
            <form onSubmit={postInternship}>
              <label>
                {t("internships.title")}
                <input name="title" value={formData.title} onChange={handleChange} />
              </label>
              <label>
                {t("internships.description")}
                <textarea name="description" value={formData.description} onChange={handleChange} rows="4" />
              </label>
              <div className="form-row">
                <label>
                  {t("internships.location")}
                  <input name="location" value={formData.location} onChange={handleChange} />
                </label>
                <label>
                  {t("internships.slots")}
                  <input type="number" min="1" name="slots" value={formData.slots} onChange={handleChange} />
                </label>
              </div>
              <button className="publish-btn" disabled={posting}>
                {posting ? t("internships.posting") : postType === "offer" ? t("internships.postOffer") : t("internships.postRequest")}
              </button>
            </form>
          </section>
        )}

        <section className="internships-list">
          {internships.length === 0 ? (
            <p className="empty-state">{t("internships.noInternshipListingsYet")}</p>
          ) : (
            internships.map((item) => (
              <article className="internship-card" key={item.id}>
                <div className="internship-meta">
                  <span className={`type-pill ${item.type}`}>{item.type === "offer" ? t("internships.farmerOffer") : t("internships.institutionRequest")}</span>
                  <span>{t("internships.slots", { count: item.slots })}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                {item.location && (
                  <p className="internship-location">
                    <MapPin size={14} /> {item.location}
                  </p>
                )}
                <p className="internship-host">{t("internships.postedBy", { name: item.postedByName })}</p>
                <div className="internship-actions">{renderActions(item)}</div>
              </article>
            ))
          )}
        </section>
      </main>
    </InsightsFrame>
  );
}
