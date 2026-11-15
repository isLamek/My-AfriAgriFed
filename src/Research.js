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
  where,
} from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { logTelemetryEvent, TELEMETRY_EVENTS } from "./telemetry";
import InsightsFrame from "./InsightsFrame";
import "./Research.css";
import { t, tv } from "./i18n";

export default function Research() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState(null);
  const [myProblems, setMyProblems] = useState([]);
  const [problemForm, setProblemForm] = useState({ title: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

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
    const articlesQuery = query(
      collection(db, "institutionResearchArticles"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(articlesQuery, (snapshot) => {
      const researchArticles = snapshot.docs.map((articleDoc) => ({
        id: articleDoc.id,
        ...articleDoc.data(),
      }));

      setArticles(researchArticles);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || userType !== "farmer") return;

    const problemsQuery = query(
      collection(db, "researchProblems"),
      where("farmerId", "==", uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(problemsQuery, (snapshot) => {
      setMyProblems(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });

    return () => unsubscribe();
  }, [userType]);

  const submitProblem = async (event) => {
    event.preventDefault();

    if (!problemForm.title.trim() || !problemForm.description.trim()) {
      alert(t("research.pleaseDescribeTheProblemYouRe"));
      return;
    }

    setSubmitting(true);

    try {
      const user = auth.currentUser;

      await addDoc(collection(db, "researchProblems"), {
        title: problemForm.title,
        description: problemForm.description,
        farmerId: user?.uid || "",
        farmerName: user?.displayName || user?.email || "Farmer",
        farmerEmail: user?.email || "",
        status: "open",
        createdAt: serverTimestamp(),
      });

      logTelemetryEvent(TELEMETRY_EVENTS.RESEARCH_PROBLEM_SUBMITTED, { title: problemForm.title });
      setProblemForm({ title: "", description: "" });
    } catch (error) {
      console.error(error);
      alert(t("research.couldNotSubmit", { error: error.message }));
    } finally {
      setSubmitting(false);
    }
  };

  const answeredArticleFor = (problem) =>
    articles.find((article) => article.id === problem.answeredArticleId);

  return (
    <InsightsFrame
      eyebrow={t("research.institutionResearch")}
      title={t("research.farmingResearchArticles")}
      subtitle={t("research.readAgriculturalReportsLinksAndPdfs")}
      activePath="/research"
    >
      {userType === "farmer" && (
        <section className="research-problems">
          <h2>{t("research.submitProblemForResearch")}</h2>
          <p>{t("research.institutionsWillSeeThisAndCan")}</p>

          <form onSubmit={submitProblem} className="problem-form">
            <input
              placeholder={t("research.shortTitleEgAphidsOnTomato")}
              value={problemForm.title}
              onChange={(event) => setProblemForm((prev) => ({ ...prev, title: event.target.value }))}
            />
            <textarea
              placeholder={t("research.describeWhatYouReExperiencing")}
              rows="3"
              value={problemForm.description}
              onChange={(event) => setProblemForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <button disabled={submitting}>{submitting ? t("research.submitting") : t("research.submitProblem")}</button>
          </form>

          {myProblems.length > 0 && (
            <div className="my-problems-list">
              <h3>{t("research.yourSubmittedProblems")}</h3>
              {myProblems.map((problem) => {
                const answer = answeredArticleFor(problem);
                return (
                  <div className="problem-card" key={problem.id}>
                    <div className="problem-status-row">
                      <strong>{problem.title}</strong>
                      <span className={`status-pill ${problem.status}`}>
                        {problem.status === "answered" ? t("research.answered") : t("research.awaitingResearch")}
                      </span>
                    </div>
                    <p>{problem.description}</p>
                    {answer && (
                      <div className="problem-answer">
                        <p className="eyebrow">{t("research.recommendation")}</p>
                        <h4>{answer.title}</h4>
                        <p>{answer.summary}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <main className="research-news-layout">
        <section className="research-lead">
          {articles[0]?.image?.url && (
            <img src={articles[0].image.url} alt={articles[0].title} />
          )}

          {articles[0] ? (
            <div className="research-lead-content">
              <div className="article-meta">
                <span>{articles[0].category ? tv(articles[0].category) : t("research.research")}</span>
                <span>{articles[0].sourceName || articles[0].authorEmail}</span>
              </div>
              <h2>{articles[0].title}</h2>
              <p>{articles[0].summary}</p>
              <div className="article-actions">
                {articles[0].articleUrl && (
                  <a href={articles[0].articleUrl} target="_blank" rel="noreferrer">
                    {t("research.openLink")}
                  </a>
                )}
                {articles[0].pdf?.url && (
                  <a href={articles[0].pdf.url} target="_blank" rel="noreferrer">
                    {t("research.viewPdf")}
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="research-lead-content">
              <h2>{loading ? t("research.loadingResearch") : t("research.noResearchArticlesYet")}</h2>
              <p>{t("research.institutionPostsWillAppearHereOnce")}</p>
            </div>
          )}
        </section>

        <section className="research-list">
          {articles.slice(1).map((article) => (
            <article className="research-list-card" key={article.id}>
              {article.image?.url && (
                <img src={article.image.url} alt={article.title} />
              )}

              <div>
                <div className="article-meta">
                  <span>{article.category ? tv(article.category) : t("research.research")}</span>
                  <span>{article.sourceName || article.authorEmail}</span>
                </div>
                <h3>{article.title}</h3>
                <p>{article.summary}</p>

                <div className="article-actions">
                  {article.articleUrl && (
                    <a href={article.articleUrl} target="_blank" rel="noreferrer">
                      {t("research.openLink")}
                    </a>
                  )}
                  {article.pdf?.url && (
                    <a href={article.pdf.url} target="_blank" rel="noreferrer">
                      {t("research.viewPdf")}
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </InsightsFrame>
  );
}
