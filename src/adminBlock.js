import React, { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { ref, onValue } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { auth, db, database } from "./firebaseConfig";
import { isAdmin } from "./admin";
import { notifyUser } from "./notifications";
import { logTelemetryEvent, TELEMETRY_EVENTS } from "./telemetry";
import "./adminBlock.css";

const adminPages = [
  { label: "Admin Dashboard", path: "/admin/dashboard" },
  { label: "Home", path: "/" },
  { label: "Register", path: "/register" },
  { label: "Consumer Dashboard", path: "/dashboard" },
  { label: "Farmer Dashboard", path: "/farmerdashboard" },
  { label: "Institution Dashboard", path: "/institutiondashboard" },
  { label: "Prices", path: "/prices" },
  { label: "Profile", path: "/profile" },
];

const isPendingReview = (user) => {
  const documentStatus = user.accountStatus?.documentStatus || user.documentStatus;
  const registrationStatus =
    user.accountStatus?.registrationStatus || user.status;

  return (
    user.userType !== "consumer" &&
    (documentStatus === "pending" ||
      documentStatus === "submitted" ||
      registrationStatus === "pending")
  );
};

export default function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [documentUsers, setDocumentUsers] = useState([]);
  const [applications, setApplications] = useState([]);
  const adminId = auth.currentUser?.uid;

  useEffect(() => {
    const verifyAdmin = async () => {
      const allowed = await isAdmin(auth.currentUser);

      if (!allowed) {
        alert("Access denied");
        navigate("/");
      }
    };

    verifyAdmin();
  }, [navigate]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const users = snapshot.docs
        .map((userDoc) => ({
          id: userDoc.id,
          ...userDoc.data(),
        }));
      const reviewUsers = users.filter(isPendingReview);
      const usersWithDocuments = users.filter(
        (user) =>
          ["farmer", "institution"].includes(user.userType) &&
          Object.values(user.documents || {}).some((document) => document?.url)
      );

      setPendingUsers(reviewUsers);
      setDocumentUsers(usersWithDocuments);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const applicationsRef = ref(database, "farmerVerification");

    const unsubscribe = onValue(applicationsRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        setApplications([]);
        return;
      }

      const pendingApplications = Object.entries(data)
        .map(([id, app]) => ({
          id,
          ...app,
        }))
        .filter((app) => (app.status || "pending") === "pending");

      setApplications(pendingApplications);
    });

    return () => unsubscribe();
  }, []);

  const approveUser = async (userId) => {
    await updateDoc(doc(db, "users", userId), {
      approved: true,
      status: "verified",
      "accountStatus.registrationStatus": "verified",
      "accountStatus.documentStatus": "approved",
      "adminReview.reviewedBy": adminId,
      "adminReview.reviewedAt": serverTimestamp(),
      "adminReview.notes": "Documents verified successfully",
    });

    await notifyUser(userId, {
      title: "Your account was approved",
      body: "You can now sign in and access your dashboard.",
      link: "/signin",
    });

    logTelemetryEvent(TELEMETRY_EVENTS.ADMIN_USER_APPROVED, { userId });
  };

  const rejectUser = async (userId) => {
    const reason = prompt("Reason for rejection:");

    if (!reason) return;

    await updateDoc(doc(db, "users", userId), {
      approved: false,
      status: "rejected",
      "accountStatus.registrationStatus": "rejected",
      "accountStatus.documentStatus": "rejected",
      "adminReview.reviewedBy": adminId,
      "adminReview.reviewedAt": serverTimestamp(),
      "adminReview.notes": reason,
    });

    await notifyUser(userId, {
      title: "Your account was not approved",
      body: reason,
      link: "/signin",
    });

    logTelemetryEvent(TELEMETRY_EVENTS.ADMIN_USER_REJECTED, { userId, reason });
  };

  const approveFarmer = async (userId) => {
    await updateDoc(doc(db, "users", userId), {
      approved: true,
      status: "verified",
      "accountStatus.registrationStatus": "verified",
      "accountStatus.documentStatus": "approved",
      "adminReview.reviewedBy": adminId,
      "adminReview.reviewedAt": serverTimestamp(),
    });

    await notifyUser(userId, {
      title: "Your account was approved",
      body: "You can now sign in and access your dashboard.",
      link: "/signin",
    });

    logTelemetryEvent(TELEMETRY_EVENTS.ADMIN_USER_APPROVED, { userId });
  };

  const rejectFarmer = async (userId) => {
    await deleteDoc(doc(db, "users", userId));
  };

  return (
    <div className="admin-container">
      <div className="admin-nav">
        {adminPages.map((page) => (
          <button key={page.path} onClick={() => navigate(page.path)}>
            {page.label}
          </button>
        ))}
      </div>

      <h1 className="admin-title">Pending Verifications</h1>

      {loading ? (
        <p>Loading pending users...</p>
      ) : pendingUsers.length === 0 ? (
        <p>No users awaiting review.</p>
      ) : (
        pendingUsers.map((user) => (
          <div className="user-card" key={user.id}>
            <div className="user-header">
              <div>
                <div className="user-name">
                  {user.personalInfo?.firstName} {user.personalInfo?.lastName}
                </div>
                <div className="user-email">{user.personalInfo?.email}</div>
              </div>
              <strong>{user.userType}</strong>
            </div>

            <div className="document-links">
              {Object.entries(user.documents || {}).map(([name, document]) =>
                document?.url ? (
                  <a
                    key={name}
                    href={document.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View {name.replace(/([A-Z])/g, " $1")}
                  </a>
                ) : null
              )}
            </div>

            <div className="admin-actions">
              <button className="approve-btn" onClick={() => approveUser(user.id)}>
                Approve
              </button>
              <button className="reject-btn" onClick={() => rejectUser(user.id)}>
                Reject
              </button>
            </div>
          </div>
        ))
      )}

      <h2 className="admin-subtitle">Farmer Applications</h2>

      {applications.length === 0 ? (
        <p>No farmer applications found.</p>
      ) : (
        applications.map((app) => (
          <div key={app.id} className="application-card">
            <h3>{app.email}</h3>
            <p>Status: {app.status || "Pending"}</p>

            <div className="document-links">
              {app.nationalId && (
                <a href={app.nationalId} target="_blank" rel="noreferrer">
                  View National ID
                </a>
              )}
              {app.farmProof && (
                <a href={app.farmProof} target="_blank" rel="noreferrer">
                  View Farm Proof
                </a>
              )}
            </div>

            <div className="admin-actions">
              <button className="approve-btn" onClick={() => approveFarmer(app.id)}>
                Approve
              </button>
              <button className="reject-btn" onClick={() => rejectFarmer(app.id)}>
                Reject
              </button>
            </div>
          </div>
        ))
      )}

      <h2 className="admin-subtitle">All Farmer and Institution Documents</h2>

      {documentUsers.length === 0 ? (
        <p>No farmer or institution documents found.</p>
      ) : (
        <div className="document-review-grid">
          {documentUsers.map((user) => (
            <div className="document-review-card" key={user.id}>
              <div className="user-header">
                <div>
                  <div className="user-name">
                    {user.personalInfo?.firstName} {user.personalInfo?.lastName}
                    {user.questionnaireData?.institutionName
                      ? ` - ${user.questionnaireData.institutionName}`
                      : ""}
                  </div>
                  <div className="user-email">{user.personalInfo?.email}</div>
                </div>
                <strong>{user.userType}</strong>
              </div>

              <div className="document-links document-list">
                {Object.entries(user.documents || {}).map(([name, document]) =>
                  document?.url ? (
                    <a
                      key={name}
                      href={document.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {name.replace(/([A-Z])/g, " $1")}
                      {document.fileName ? `: ${document.fileName}` : ""}
                    </a>
                  ) : null
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
