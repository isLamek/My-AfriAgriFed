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
      toast.error("Please add a title.");
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
      toast.error("Could not post internship: " + error.message);
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
      title: "Internship request approved",
      body: `${user?.email || "A farmer"} approved your request: ${item.title}`,
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
      title: "Internship offer claimed",
      body: `${user?.email || "An institution"} wants to fill: ${item.title}. Please approve.`,
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
      title: "Internship placement approved",
      body: `Your placement request for "${item.title}" was approved.`,
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

    if (item.status === "closed") return <span className="status-pill closed">Closed</span>;

    if (item.status === "open") {
      if (item.type === "request" && userType === "farmer") {
        return <button onClick={() => approveRequestAsFarmer(item)}>Offer &amp; Approve</button>;
      }
      if (item.type === "offer" && userType === "institution") {
        return <button onClick={() => claimOfferAsInstitution(item)}>Request Placement</button>;
      }
      if (isOwner) {
        return <button className="ghost-btn" onClick={() => closeListing(item)}>Close</button>;
      }
      return <span className="status-pill open">Open</span>;
    }

    if (item.status === "claimed") {
      if (isOwner && userType === "farmer") {
        return <button onClick={() => approveClaimAsFarmer(item)}>Approve {item.claimedByName}</button>;
      }
      return <span className="status-pill pending">Pending farmer approval</span>;
    }

    if (item.status === "approved") {
      return <span className="status-pill approved">Approved</span>;
    }

    return null;
  };

  return (
    <InsightsFrame
      eyebrow="Producers &amp; institutions"
      title="Internships"
      subtitle="Farmers offer placements, institutions request them. Farmers give the final approval."
      activePath="/internships"
    >
      <main className="internships-layout">
        {canPost && (
          <section className="internships-form-card">
            <h2>{postType === "offer" ? "Offer an Internship" : "Request an Internship"}</h2>
            <form onSubmit={postInternship}>
              <label>
                Title
                <input name="title" value={formData.title} onChange={handleChange} />
              </label>
              <label>
                Description
                <textarea name="description" value={formData.description} onChange={handleChange} rows="4" />
              </label>
              <div className="form-row">
                <label>
                  Location
                  <input name="location" value={formData.location} onChange={handleChange} />
                </label>
                <label>
                  Slots
                  <input type="number" min="1" name="slots" value={formData.slots} onChange={handleChange} />
                </label>
              </div>
              <button className="publish-btn" disabled={posting}>
                {posting ? "Posting..." : postType === "offer" ? "Post Offer" : "Post Request"}
              </button>
            </form>
          </section>
        )}

        <section className="internships-list">
          {internships.length === 0 ? (
            <p className="empty-state">No internship listings yet.</p>
          ) : (
            internships.map((item) => (
              <article className="internship-card" key={item.id}>
                <div className="internship-meta">
                  <span className={`type-pill ${item.type}`}>{item.type === "offer" ? "Farmer Offer" : "Institution Request"}</span>
                  <span>{item.slots} slot(s)</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                {item.location && (
                  <p className="internship-location">
                    <MapPin size={14} /> {item.location}
                  </p>
                )}
                <p className="internship-host">Posted by {item.postedByName}</p>
                <div className="internship-actions">{renderActions(item)}</div>
              </article>
            ))
          )}
        </section>
      </main>
    </InsightsFrame>
  );
}
