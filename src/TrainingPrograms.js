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
import { MapPin, Video } from "lucide-react";
import { auth, db, database } from "./firebaseConfig";
import { logTelemetryEvent, TELEMETRY_EVENTS } from "./telemetry";
import toast from "react-hot-toast";
import InsightsFrame from "./InsightsFrame";
import "./TrainingPrograms.css";
import { t, tIn } from "./i18n";

const emptyProgram = {
  title: "",
  description: "",
  mode: "In-person",
  location: "",
  startDate: "",
  videoUrl: "",
};

export default function TrainingPrograms() {
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
      toast.error(t("training.pleaseAddTitleAndStartDate"));
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
        content: tIn("en", "training.feedPost", { title: formData.title, mode: formData.mode, date: formData.startDate }),
        imageUrl: "",
        comments: {},
        createdAt: Date.now(),
      });

      logTelemetryEvent(TELEMETRY_EVENTS.TRAINING_PROGRAM_POSTED, { title: formData.title });

      setFormData(emptyProgram);
    } catch (error) {
      console.error(error);
      toast.error(t("training.couldNotPost", { error: error.message }));
    } finally {
      setPosting(false);
    }
  };

  return (
    <InsightsFrame
      eyebrow={t("training.educationProducers")}
      title={t("training.trainingPrograms")}
      subtitle={t("training.programsInstitutionsRunForFarmersShared")}
      activePath="/training"
    >
      <main className="training-layout">
        {canPost && (
          <section className="training-form-card">
            <h2>{t("training.postTrainingProgram")}</h2>
            <form onSubmit={postProgram}>
              <label>
                {t("training.title")}
                <input name="title" value={formData.title} onChange={handleChange} placeholder={t("training.egSoilHealthCompostingWorkshop")} />
              </label>

              <label>
                {t("training.description")}
                <textarea name="description" value={formData.description} onChange={handleChange} rows="4" />
              </label>

              <div className="form-row">
                <label>
                  {t("training.mode")}
                  <select name="mode" value={formData.mode} onChange={handleChange}>
                    <option>{t("training.inPerson")}</option>
                    <option>{t("training.online")}</option>
                    <option>{t("training.hybrid")}</option>
                  </select>
                </label>

                <label>
                  {t("training.locationLink")}
                  <input name="location" value={formData.location} onChange={handleChange} placeholder={t("training.venueOrMeetingLink")} />
                </label>
              </div>

              <label>
                {t("training.startDate")}
                <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} />
              </label>

              <label>
                {t("training.recordedClassTutorialLinkOptional")}
                <input
                  name="videoUrl"
                  value={formData.videoUrl}
                  onChange={handleChange}
                  placeholder={t("training.youtubeVimeoOrOtherVideoLink")}
                />
              </label>

              <button className="publish-btn" disabled={posting}>
                {posting ? t("training.posting") : t("training.postProgram")}
              </button>
            </form>
          </section>
        )}

        <section className="training-list">
          {programs.length === 0 ? (
            <p className="empty-state">{t("training.noTrainingProgramsPostedYet")}</p>
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
                      {t("training.watchRecordedClass")}
                    </a>
                  </p>
                )}
                <p className="training-host">{t("training.hostedBy", { name: program.institutionName })}</p>
              </article>
            ))
          )}
        </section>
      </main>
    </InsightsFrame>
  );
}
