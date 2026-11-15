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
import { t, tv, tIn } from "./i18n";

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
      title: tIn("en", "institution.recommendation", { title: problem.title }), // stored text: English
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
      toast.error(t("institution.pleaseAddTitleAndSummaryBefore"));
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
          key: "notif.research.answered",
          params: { item: formData.title },
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
      toast.error(t("institution.couldNotPublish", { error: error.message }));
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
      eyebrow={t("institution.institutionDashboard")}
      title={t("institution.farmingResearchDesk")}
      subtitle={t("institution.publishAgriculturalResearchFieldReportsLinks")}
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
      theme={isAdminUser ? "admin" : "institution"}
    >
      <section className="farmer-problems aaf-card">
        <h2>{t("institution.farmerProblemsAwaitingResearch")}</h2>

        {openProblems.length === 0 ? (
          <p className="empty-state">{t("institution.noOpenProblemsFromFarmersRight")}</p>
        ) : (
          <div className="farmer-problems-grid">
            {openProblems.map((problem) => (
              <div className="farmer-problem-card" key={problem.id}>
                <strong>{problem.title}</strong>
                <p>{problem.description}</p>
                <span className="problem-farmer">{t("institution.fromName", { name: problem.farmerName })}</span>
                <button onClick={() => startResponse(problem)}>{t("institution.respondWithResearch")}</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <main className="institution-layout">
        <section className="research-publisher aaf-card">
          <h2>{respondingTo ? t("institution.respondTo", { title: respondingTo.title }) : t("institution.uploadResearch")}</h2>
          {respondingTo && (
            <button type="button" className="cancel-response-btn" onClick={() => {
              setRespondingTo(null);
              setFormData(emptyArticle);
            }}>
              {t("institution.cancelResponse")}
            </button>
          )}

          <form onSubmit={publishArticle}>
            <label>
              {t("institution.headline")}
              <input
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder={t("institution.egDroughtTolerantMilletTrialResults")}
              />
            </label>

            <label>
              {t("institution.summary")}
              <textarea
                name="summary"
                value={formData.summary}
                onChange={handleChange}
                rows="5"
                placeholder={t("institution.writeShortResearchSummary")}
              />
            </label>

            <div className="form-row">
              <label>
                {t("institution.category")}
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                >
                  <option value="Research">{t("institution.research")}</option>
                  <option value="Field Trial">{t("institution.fieldTrial")}</option>
                  <option value="Market Insight">{t("institution.marketInsight")}</option>
                  <option value="Climate">{t("institution.climate")}</option>
                  <option value="Training">{t("institution.training")}</option>
                </select>
              </label>

              <label>
                {t("institution.sourceName")}
                <input
                  name="sourceName"
                  value={formData.sourceName}
                  onChange={handleChange}
                  placeholder={t("institution.institutionOrJournal")}
                />
              </label>
            </div>

            <label>
              {t("institution.researchLink")}
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
                {t("institution.photo")}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setPhotoFile(event.target.files?.[0])}
                />
              </label>

              <label>
                {t("institution.pdf")}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => setPdfFile(event.target.files?.[0])}
                />
              </label>
            </div>

            <button className="publish-btn" disabled={publishing}>
              {publishing ? t("institution.publishing") : t("institution.publishArticle")}
            </button>
          </form>
        </section>

        <section className="research-feed aaf-card">
          <div className="feed-heading">
            <p className="eyebrow">{t("institution.researchNews")}</p>
            <h2>{t("institution.agriculturalArticles")}</h2>
          </div>

          {articles.length === 0 ? (
            <p className="empty-state">{t("institution.noResearchArticlesPublishedYet")}</p>
          ) : (
            articles.map((article) => (
              <article className="research-card" key={article.id}>
                {article.image?.url && (
                  <img src={article.image.url} alt={article.title} />
                )}

                <div className="research-card-content">
                  <div className="article-meta">
                    <span>{article.category ? tv(article.category) : t("institution.research")}</span>
                    <span>{article.sourceName || article.authorEmail}</span>
                  </div>

                  <h3>{article.title}</h3>
                  <p>{article.summary}</p>

                  <div className="article-actions">
                    {article.articleUrl && (
                      <a href={article.articleUrl} target="_blank" rel="noreferrer">
                        {t("institution.openLink")}
                      </a>
                    )}
                    {article.pdf?.url && (
                      <a href={article.pdf.url} target="_blank" rel="noreferrer">
                        {t("institution.viewPdf")}
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
