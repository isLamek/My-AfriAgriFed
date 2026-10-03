import React, { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { ref, onValue } from "firebase/database";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import InsightsFrame from "./InsightsFrame";
import { auth, db, database } from "./firebaseConfig";
import { isAdmin } from "./admin";
import { notifyUser } from "./notifications";
import { logTelemetryEvent, TELEMETRY_EVENTS } from "./telemetry";
import "./adminBlock.css";

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
  const [busyId, setBusyId] = useState(null);

  // Every action reports success or failure (before, a refused write failed silently).
  const run = async (id, successText, action) => {
    setBusyId(id);
    try {
      await action();
      toast.success(successText);
    } catch (error) {
      toast.error(
        error.code === "permission-denied"
          ? "You do not have permission to do that. Check that your e-mail is verified."
          : error.message || "Something went wrong."
      );
    } finally {
      setBusyId(null);
    }
  };

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

  const doApproveUser = async (userId) => {
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

  const doRejectUser = async (userId, reason) => {
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

  const doApproveFarmer = async (userId) => {
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

  // Legacy applications carry an id that anyone signed in could have chosen, so
  // rejecting one must never delete a profile (it used to). It marks the profile
  // rejected instead, which an admin can reverse.
  const doRejectFarmer = async (userId) => {
    await updateDoc(doc(db, "users", userId), {
      approved: false,
      status: "rejected",
      "accountStatus.registrationStatus": "rejected",
      "adminReview.reviewedBy": adminId,
      "adminReview.reviewedAt": serverTimestamp(),
      "adminReview.notes": "Legacy farmer application rejected",
    });
  };

  const nameOf = (user) =>
    [user.personalInfo?.firstName, user.personalInfo?.lastName].filter(Boolean).join(" ") || user.personalInfo?.email || "this account";

  const approveUser = (user) => {
    if (!window.confirm(`Approve ${nameOf(user)} (${user.userType})? They get access straight away.`)) return;
    run(user.id, `${nameOf(user)} approved.`, () => doApproveUser(user.id));
  };

  const rejectUser = (user) => {
    const reason = (window.prompt(`Reason for rejecting ${nameOf(user)} (they will see this):`) || "").trim();
    if (!reason) return;
    run(user.id, `${nameOf(user)} rejected.`, () => doRejectUser(user.id, reason));
  };

  const approveFarmer = (app) => {
    if (!window.confirm(`Approve the application from ${app.email || app.id}?`)) return;
    run(app.id, "Application approved.", () => doApproveFarmer(app.id));
  };

  const rejectFarmer = (app) => {
    if (!window.confirm(`Reject the application from ${app.email || app.id}? Their account is marked rejected (not deleted).`)) return;
    run(app.id, "Application rejected.", () => doRejectFarmer(app.id));
  };

  return (
    <InsightsFrame
      eyebrow="Admin"
      title="Verification Queue"
      subtitle="Check the documents, then approve or reject new farmer and institution accounts."
      activePath="/admin"
    >
      <h2 className="admin-subtitle first">Pending verifications</h2>

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
              <button className="approve-btn" disabled={busyId === user.id} onClick={() => approveUser(user)}>
                Approve
              </button>
              <button className="reject-btn" disabled={busyId === user.id} onClick={() => rejectUser(user)}>
                Reject
              </button>
            </div>
          </div>
        ))
      )}

      <h2 className="admin-subtitle">Legacy farmer applications</h2>

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
              <button className="approve-btn" disabled={busyId === app.id} onClick={() => approveFarmer(app)}>
                Approve
              </button>
              <button className="reject-btn" disabled={busyId === app.id} onClick={() => rejectFarmer(app)}>
                Reject
              </button>
            </div>
          </div>
        ))
      )}

      <h2 className="admin-subtitle">All farmer and institution documents</h2>

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
    </InsightsFrame>
  );
}
