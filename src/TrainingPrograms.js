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
import { ref, push } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { MapPin, Video } from "lucide-react";
import { auth, db, database } from "./firebaseConfig";
import { logTelemetryEvent, TELEMETRY_EVENTS } from "./telemetry";
import toast from "react-hot-toast";
import "./TrainingPrograms.css";

const emptyProgram = {
  title: "",
  description: "",
  mode: "In-person",
  location: "",
  startDate: "",
  videoUrl: "",
};

export default function TrainingPrograms() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [formData, setFormData] = useState(emptyProgram);
  const [posting, setPosting] = useState(false);
  const [userType, setUserType] = useState(null);

  const canPost = userType === "institution";

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
    const programsQuery = query(collection(db, "trainingPrograms"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(programsQuery, (snapshot) => {
      setPrograms(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const postProgram = async (event) => {
    event.preventDefault();

    if (!formData.title.trim() || !formData.startDate) {
      toast.error("Please add a title and a start date.");
      return;
    }

    setPosting(true);

    try {
      const user = auth.currentUser;

      await addDoc(collection(db, "trainingPrograms"), {
        ...formData,
        institutionId: user?.uid || "",
        institutionName: user?.displayName || user?.email || "Institution",
        institutionEmail: user?.email || "",
        createdAt: serverTimestamp(),
      });

      // Surface it in the shared community feed too, per the training-program flow.
      await push(ref(database, "posts"), {
        userId: user?.uid || "",
        userName: user?.email || "Institution",
        authorRole: "Institution",
        content: `New training program: ${formData.title} (${formData.mode}, starts ${formData.startDate}). See Training Programs for details.`,
        imageUrl: "",
        comments: {},
        createdAt: Date.now(),
      });

      logTelemetryEvent(TELEMETRY_EVENTS.TRAINING_PROGRAM_POSTED, { title: formData.title });

      setFormData(emptyProgram);
    } catch (error) {
      console.error(error);
      toast.error("Could not post training program: " + error.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="training-page">
      <header className="training-header">
        <div>
          <p className="eyebrow">Education &amp; producers</p>
          <h1>Training Programs</h1>
          <p>Programs institutions run for farmers, shared to the community feed.</p>
        </div>

        <div className="training-actions">
          <button onClick={() => navigate(-1)}>Back</button>
        </div>
      </header>

      <main className="training-layout">
        {canPost && (
          <section className="training-form-card">
            <h2>Post a Training Program</h2>
            <form onSubmit={postProgram}>
              <label>
                Title
                <input name="title" value={formData.title} onChange={handleChange} placeholder="e.g., Soil health & composting workshop" />
              </label>

              <label>
                Description
                <textarea name="description" value={formData.description} onChange={handleChange} rows="4" />
              </label>

              <div className="form-row">
                <label>
                  Mode
                  <select name="mode" value={formData.mode} onChange={handleChange}>
                    <option>In-person</option>
                    <option>Online</option>
                    <option>Hybrid</option>
                  </select>
                </label>

                <label>
                  Location / Link
                  <input name="location" value={formData.location} onChange={handleChange} placeholder="Venue or meeting link" />
                </label>
              </div>

              <label>
                Start Date
                <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} />
              </label>

              <label>
                Recorded class / tutorial link (optional)
                <input
                  name="videoUrl"
                  value={formData.videoUrl}
                  onChange={handleChange}
                  placeholder="YouTube, Vimeo or other video link"
                />
              </label>

              <button className="publish-btn" disabled={posting}>
                {posting ? "Posting..." : "Post Program"}
              </button>
            </form>
          </section>
        )}

        <section className="training-list">
          {programs.length === 0 ? (
            <p className="empty-state">No training programs posted yet.</p>
          ) : (
            programs.map((program) => (
              <article className="training-card" key={program.id}>
                <div className="training-meta">
                  <span>{program.mode}</span>
                  <span>{program.startDate}</span>
                </div>
                <h3>{program.title}</h3>
                <p>{program.description}</p>
                {program.location && (
                  <p className="training-location">
                    <MapPin size={14} /> {program.location}
                  </p>
                )}
                {program.videoUrl && (
                  <p className="training-location">
                    <Video size={14} />{" "}
                    <a href={program.videoUrl} target="_blank" rel="noreferrer">
                      Watch recorded class
                    </a>
                  </p>
                )}
                <p className="training-host">Hosted by {program.institutionName}</p>
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
