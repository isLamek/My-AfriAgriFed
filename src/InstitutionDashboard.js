import React, { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { uploadToCloudinary } from "./cloudinairyUpload";
import { notifyUser } from "./notifications";
import { logTelemetryEvent, TELEMETRY_EVENTS } from "./telemetry";
import { getAdminProfile } from "./admin";
import { buildNavSections } from "./navConfig";
import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import toast from "react-hot-toast";
import "./InstitutionDashboard.css";

const emptyArticle = {
  title: "",
  summary: "",
  category: "Research",
  sourceName: "",
  articleUrl: "",
};

export default function InstitutionDashboard() {
  const [articles, setArticles] = useState([]);
  const [formData, setFormData] = useState(emptyArticle);
  const [photoFile, setPhotoFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [respondingTo, setRespondingTo] = useState(null);
  const [openProblems, setOpenProblems] = useState([]);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getAdminProfile(auth.currentUser).then((profile) => setIsAdminUser(!!profile));
  }, []);

  useEffect(() => {
    const articlesQuery = query(
      collection(db, "institutionResearchArticles"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(articlesQuery, (snapshot) => {
      const articleData = snapshot.docs.map((articleDoc) => ({
        id: articleDoc.id,
        ...articleDoc.data(),
      }));

      setArticles(articleData);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const problemsQuery = query(
      collection(db, "researchProblems"),
      where("status", "==", "open"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(problemsQuery, (snapshot) => {
      setOpenProblems(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });

    return () => unsubscribe();
  }, []);

  const startResponse = (problem) => {
    setRespondingTo(problem);
    setFormData({
      title: `Recommendation: ${problem.title}`,
      summary: "",
      category: "Field Trial",
      sourceName: "",
      articleUrl: "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const publishArticle = async (event) => {
    event.preventDefault();

    if (!formData.title.trim() || !formData.summary.trim()) {
      toast.error("Please add a title and summary before publishing.");
      return;
    }

    setPublishing(true);

    try {
      let image = null;
      let pdf = null;
      const uid = auth.currentUser?.uid || "institution";

      if (photoFile) {
        const upload = await uploadToCloudinary(
          photoFile,
          `afriagrifed/institutions/${uid}/research/images`
        );

        image = {
          url: upload.secure_url,
          publicId: upload.public_id,
        };
      }

      if (pdfFile) {
        const upload = await uploadToCloudinary(
          pdfFile,
          `afriagrifed/institutions/${uid}/research/pdfs`
        );

        pdf = {
          url: upload.secure_url,
          publicId: upload.public_id,
          fileName: pdfFile.name,
        };
      }

      const articleRef = await addDoc(collection(db, "institutionResearchArticles"), {
        ...formData,
        image,
        pdf,
        authorId: uid,
        authorEmail: auth.currentUser?.email || "",
        respondsToProblemId: respondingTo?.id || null,
        createdAt: serverTimestamp(),
      });

      if (respondingTo) {
        await updateDoc(doc(db, "researchProblems", respondingTo.id), {
          status: "answered",
          answeredArticleId: articleRef.id,
          answeredAt: serverTimestamp(),
        });

        await notifyUser(respondingTo.farmerId, {
          title: "Your research problem was answered",
          body: `${formData.title}`,
          link: "/research",
        });

        logTelemetryEvent(TELEMETRY_EVENTS.RESEARCH_PROBLEM_ANSWERED, {
          problemId: respondingTo.id,
        });
      }

      logTelemetryEvent(TELEMETRY_EVENTS.RESEARCH_ARTICLE_PUBLISHED, { title: formData.title });

      setFormData(emptyArticle);
      setRespondingTo(null);
      setPhotoFile(null);
      setPdfFile(null);
      event.target.reset();
    } catch (error) {
      console.error(error);
      toast.error("Could not publish research article: " + error.message);
    } finally {
      setPublishing(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    window.location.href = "/";
  };

  const navSections = buildNavSections({
    userType: "institution",
    isAdmin: isAdminUser,
    activePath: "/institutiondashboard",
  });

  return (
    <AppShell
      eyebrow="Institution dashboard"
      title="Farming Research Desk"
      subtitle="Publish agricultural research, field reports, links and PDFs."
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
      theme={isAdminUser ? "admin" : "institution"}
    >
      <section className="farmer-problems aaf-card">
        <h2>Farmer Problems Awaiting Research</h2>

        {openProblems.length === 0 ? (
          <p className="empty-state">No open problems from farmers right now.</p>
        ) : (
          <div className="farmer-problems-grid">
            {openProblems.map((problem) => (
              <div className="farmer-problem-card" key={problem.id}>
                <strong>{problem.title}</strong>
                <p>{problem.description}</p>
                <span className="problem-farmer">From {problem.farmerName}</span>
                <button onClick={() => startResponse(problem)}>Respond with Research</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <main className="institution-layout">
        <section className="research-publisher aaf-card">
          <h2>{respondingTo ? `Respond to: ${respondingTo.title}` : "Upload Research"}</h2>
          {respondingTo && (
            <button type="button" className="cancel-response-btn" onClick={() => {
              setRespondingTo(null);
              setFormData(emptyArticle);
            }}>
              Cancel response
            </button>
          )}

          <form onSubmit={publishArticle}>
            <label>
              Headline
              <input
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Drought-tolerant millet trial results"
              />
            </label>

            <label>
              Summary
              <textarea
                name="summary"
                value={formData.summary}
                onChange={handleChange}
                rows="5"
                placeholder="Write a short research summary..."
              />
            </label>

            <div className="form-row">
              <label>
                Category
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                >
                  <option>Research</option>
                  <option>Field Trial</option>
                  <option>Market Insight</option>
                  <option>Climate</option>
                  <option>Training</option>
                </select>
              </label>

              <label>
                Source Name
                <input
                  name="sourceName"
                  value={formData.sourceName}
                  onChange={handleChange}
                  placeholder="Institution or journal"
                />
              </label>
            </div>

            <label>
              Research Link
              <input
                type="url"
                name="articleUrl"
                value={formData.articleUrl}
                onChange={handleChange}
                placeholder="https://..."
              />
            </label>

            <div className="file-row">
              <label>
                Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setPhotoFile(event.target.files?.[0])}
                />
              </label>

              <label>
                PDF
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => setPdfFile(event.target.files?.[0])}
                />
              </label>
            </div>

            <button className="publish-btn" disabled={publishing}>
              {publishing ? "Publishing..." : "Publish Article"}
            </button>
          </form>
        </section>

        <section className="research-feed aaf-card">
          <div className="feed-heading">
            <p className="eyebrow">Research news</p>
            <h2>Agricultural Articles</h2>
          </div>

          {articles.length === 0 ? (
            <p className="empty-state">No research articles published yet.</p>
          ) : (
            articles.map((article) => (
              <article className="research-card" key={article.id}>
                {article.image?.url && (
                  <img src={article.image.url} alt={article.title} />
                )}

                <div className="research-card-content">
                  <div className="article-meta">
                    <span>{article.category || "Research"}</span>
                    <span>{article.sourceName || article.authorEmail}</span>
                  </div>

                  <h3>{article.title}</h3>
                  <p>{article.summary}</p>

                  <div className="article-actions">
                    {article.articleUrl && (
                      <a href={article.articleUrl} target="_blank" rel="noreferrer">
                        Open Link
                      </a>
                    )}
                    {article.pdf?.url && (
                      <a href={article.pdf.url} target="_blank" rel="noreferrer">
                        View PDF
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </AppShell>
  );
}
