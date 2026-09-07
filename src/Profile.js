import React, { useEffect, useState } from "react";
import { sendPasswordResetEmail, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { LayoutDashboard, FileText, Lock, Pencil, Paperclip } from "lucide-react";
import { auth, db } from "./firebaseConfig";
import { uploadToCloudinary } from "./cloudinairyUpload";
import { getAdminProfile } from "./admin";
import { buildNavSections } from "./navConfig";
import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import appIcon from "./images/app-icon.png";
import seedMark from "./images/seed-mark.png";
import "./Profile.css";

function formatLabel(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (typeof value?.toDate === "function") return value.toDate().toLocaleString();
  if (Array.isArray(value)) return value.length ? value.join(", ") : "Not provided";
  if (typeof value === "object") return null;
  return String(value);
}

function InfoGrid({ data }) {
  if (!data || typeof data !== "object") return null;
  const entries = Object.entries(data);
  if (!entries.length) return <p className="profile-empty">Nothing on file yet.</p>;

  return (
    <div className="profile-fields">
      {entries.map(([key, value]) => {
        const formatted = formatValue(value);

        if (formatted === null) {
          return (
            <div className="profile-nested" key={key}>
              <p className="profile-nested-title">{formatLabel(key)}</p>
              <InfoGrid data={value} />
            </div>
          );
        }

        return (
          <div className="profile-field" key={key}>
            <span>{formatLabel(key)}</span>
            <strong>{formatted}</strong>
          </div>
        );
      })}
    </div>
  );
}

const TABS = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard size={16} /> },
  { key: "documents", label: "Documents", icon: <FileText size={16} /> },
  { key: "security", label: "Security", icon: <Lock size={16} /> },
];

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState("overview");
  const [resetStatus, setResetStatus] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      const user = auth.currentUser;

      if (!user) {
        navigate("/signin", { replace: true });
        return;
      }

      const [snapshot, adminProfile] = await Promise.all([
        getDoc(doc(db, "users", user.uid)),
        getAdminProfile(user),
      ]);

      setIsAdmin(!!adminProfile);

      if (snapshot.exists()) {
        setProfile({ id: snapshot.id, ...snapshot.data() });
      } else {
        setProfile({ uid: user.uid, personalInfo: { email: user.email } });
      }

      setLoading(false);
    };

    loadProfile();
  }, [navigate]);

  const uploadProfilePicture = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setUploading(true);

    try {
      const result = await uploadToCloudinary(file, `afriagrifed/users/${auth.currentUser.uid}/profile`);

      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        profilePicture: { url: result.secure_url, publicId: result.public_id },
      });

      setProfile((prev) => ({
        ...prev,
        profilePicture: { url: result.secure_url, publicId: result.public_id },
      }));
      toast.success("Profile picture updated.");
    } catch (error) {
      console.error(error);
      toast.error("Profile picture upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const sendReset = async () => {
    if (!auth.currentUser?.email) return;
    setResetStatus("Sending...");

    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      setResetStatus(`Reset link sent to ${auth.currentUser.email}.`);
    } catch (error) {
      setResetStatus(error.message || "Could not send reset email.");
    }
  };

  const logout = async () => {
    await signOut(auth);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <img src={seedMark} alt="AfriAgriFed" />
        <p>Loading profile...</p>
      </div>
    );
  }

  const name = [profile?.personalInfo?.firstName, profile?.personalInfo?.lastName].filter(Boolean).join(" ");
  const userType = isAdmin ? "admin" : profile?.userType;

  const navSections = buildNavSections({ userType, isAdmin, activePath: "/profile" });

  return (
    <AppShell
      eyebrow="Account"
      title="My Profile"
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
      theme={userType}
    >
      <div className="profile-hero aaf-card">
        <div className="profile-identity">
          <div className="profile-photo-wrap">
            <img src={profile?.profilePicture?.url || appIcon} alt="Profile" className="profile-photo" />
            <label className="profile-photo-edit">
              {uploading ? "…" : <Pencil size={14} />}
              <input type="file" accept="image/*" onChange={uploadProfilePicture} disabled={uploading} hidden />
            </label>
          </div>

          <div>
            <h2>{name || profile?.personalInfo?.email || "AfriAgriFed User"}</h2>
            <span className="aaf-pill aaf-pill-success">{userType || "account"}</span>
          </div>
        </div>
      </div>

      <div className="profile-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`profile-tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="profile-panels">
          <section className="aaf-card profile-section">
            <h3>Personal Information</h3>
            <InfoGrid data={profile.personalInfo} />
          </section>

          <section className="aaf-card profile-section">
            <h3>Account Status</h3>
            <InfoGrid data={profile.accountStatus} />
          </section>

          <section className="aaf-card profile-section">
            <h3>Questionnaire Information</h3>
            <InfoGrid data={profile.questionnaireData} />
          </section>
        </div>
      )}

      {tab === "documents" && (
        <section className="aaf-card profile-section">
          <h3>Documents</h3>
          {profile.documents && Object.values(profile.documents).some((d) => d?.url) ? (
            <div className="profile-documents-grid">
              {Object.entries(profile.documents).map(([name, document]) =>
                document?.url ? (
                  <a key={name} href={document.url} target="_blank" rel="noreferrer" className="profile-document-card">
                    <span><Paperclip size={18} /></span>
                    <div>
                      <strong>{formatLabel(name)}</strong>
                      <p>{document.fileName || "View file"}</p>
                    </div>
                  </a>
                ) : null
              )}
            </div>
          ) : (
            <p className="profile-empty">No documents on file.</p>
          )}
        </section>
      )}

      {tab === "security" && (
        <section className="aaf-card profile-section">
          <h3>Security</h3>
          <div className="profile-field">
            <span>Email</span>
            <strong>{auth.currentUser?.email}</strong>
          </div>

          <p style={{ marginTop: "1rem" }}>
            Send yourself a password reset link by email.
          </p>
          <button className="aaf-btn aaf-btn-primary" onClick={sendReset}>
            Send Password Reset Email
          </button>
          {resetStatus && <p className="profile-reset-status">{resetStatus}</p>}
        </section>
      )}
    </AppShell>
  );
}
