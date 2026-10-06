import React, { useEffect, useState } from "react";
import { sendPasswordResetEmail, signOut, updateProfile } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { LayoutDashboard, FileText, Lock, Pencil, Paperclip, Check, X, ShieldCheck, Download, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { auth, db } from "./firebaseConfig";
import { uploadToCloudinary } from "./cloudinaryUpload";
import { getAdminProfile } from "./admin";
import { buildNavSections, roleLabel } from "./navConfig";
import { BUSINESS } from "./business";
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
  { key: "privacy", label: "Privacy", icon: <ShieldCheck size={16} /> },
];

/** Everything we hold that is directly about this person, as one JSON file. */
async function exportMyData(uid, profile) {
  const mine = async (name, field, op = "==") => {
    try {
      const snap = await getDocs(query(collection(db, name), where(field, op, uid)));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch {
      return [];
    }
  };
  const data = {
    exportedAt: new Date().toISOString(),
    profile,
    listings: await mine("marketPrices", "sellerId"),
    purchases: await mine("orders", "buyerId"),
    sales: await mine("orders", "sellerId"),
    bulkRequests: await mine("demandRequests", "buyerId"),
    conversations: await mine("conversations", "participants", "array-contains"),
    farms: profile?.userType === "farmer" ? await mine("farms", "ownerId") : [],
  };
  const replacer = (key, value) => (value && typeof value.toDate === "function" ? value.toDate().toISOString() : value);
  const blob = new Blob([JSON.stringify(data, replacer, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `afriagrifed-my-data-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function PrivacyPanel({ profile }) {
  const uid = auth.currentUser?.uid;
  const [exporting, setExporting] = useState(false);
  const [request, setRequest] = useState(undefined); // undefined = loading, null = none
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "deletionRequests", uid))
      .then((snap) => setRequest(snap.exists() ? snap.data() : null))
      .catch(() => setRequest(null));
  }, [uid]);

  const download = async () => {
    setExporting(true);
    try {
      await exportMyData(uid, profile);
    } catch (error) {
      toast.error(`Could not prepare your data: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  const requestDeletion = async () => {
    if (!window.confirm("Ask us to delete your account and personal data? You will not be able to sign in once it is done.")) return;
    setSending(true);
    try {
      const data = { uid, email: auth.currentUser.email || "", reason: reason.trim().slice(0, 500), status: "open", requestedAt: serverTimestamp() };
      await setDoc(doc(db, "deletionRequests", uid), data);
      setRequest({ ...data, requestedAt: null });
      toast.success("Request received. We will confirm by e-mail when your account has been deleted.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="profile-panels">
      <section className="aaf-card profile-section">
        <h3>Download your data</h3>
        <p className="profile-note">A copy of your profile, listings, orders, bulk requests, conversations and farms, as a JSON file.</p>
        <button className="aaf-btn aaf-btn-secondary" onClick={download} disabled={exporting}>
          <Download size={15} aria-hidden="true" /> {exporting ? "Preparing…" : "Download my data"}
        </button>
      </section>

      <section className="aaf-card profile-section">
        <h3>Analytics and cookies</h3>
        <p className="profile-note">
          Choose whether we may record anonymous usage events. Change it any time on the <Link to="/cookies">Cookie policy</Link> page.
        </p>
      </section>

      <section className="aaf-card profile-section">
        <h3>Delete your account</h3>
        {request === undefined ? (
          <p className="profile-note">Loading…</p>
        ) : request ? (
          <p className="profile-note">
            We have your deletion request{request.status === "done" ? " and it has been completed" : " and are working on it"}. Questions?
            E-mail <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.
          </p>
        ) : (
          <>
            <p className="profile-note">
              We delete your profile, listings, posts and documents. Order and payment records are kept for as long as the law
              requires (see the <Link to="/privacy">Privacy policy</Link>). Orders still in progress must be completed or
              cancelled first.
            </p>
            <label className="aaf-field">
              Anything you'd like to tell us? <span className="aaf-muted">(optional)</span>
              <textarea rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            <button className="aaf-btn aaf-btn-danger" onClick={requestDeletion} disabled={sending} style={{ marginTop: "0.75rem" }}>
              <Trash2 size={15} aria-hidden="true" /> {sending ? "Sending…" : "Request account deletion"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState("overview");
  const [resetStatus, setResetStatus] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

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

  const startEditProfile = () => {
    setEditForm({
      firstName: profile?.personalInfo?.firstName || "",
      lastName: profile?.personalInfo?.lastName || "",
      nationality: profile?.personalInfo?.nationality || "",
      gender: profile?.personalInfo?.gender || "",
    });
    setEditingProfile(true);
  };

  const cancelEditProfile = () => {
    setEditingProfile(false);
    setEditForm(null);
  };

  const saveProfile = async () => {
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      toast.error("First and last name can't be empty.");
      return;
    }

    setSavingProfile(true);

    try {
      const updatedPersonalInfo = {
        ...profile.personalInfo,
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        nationality: editForm.nationality.trim(),
        gender: editForm.gender,
      };

      await updateDoc(doc(db, "users", auth.currentUser.uid), { personalInfo: updatedPersonalInfo });

      // Keeps auth.currentUser.displayName in sync, since posts/comments/
      // listings elsewhere fall back to it (and to the account email when
      // it's unset) rather than doing an extra Firestore read per author.
      await updateProfile(auth.currentUser, {
        displayName: `${updatedPersonalInfo.firstName} ${updatedPersonalInfo.lastName}`.trim(),
      });

      setProfile((prev) => ({ ...prev, personalInfo: updatedPersonalInfo }));
      setEditingProfile(false);
      setEditForm(null);
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(error.message || "Could not update profile.");
    } finally {
      setSavingProfile(false);
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
    window.location.href = "/";
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
  const isOrganization =
    userType === "consumer" &&
    (profile?.isOrganization === true ||
      (!!profile?.questionnaireData?.consumerType && profile.questionnaireData.consumerType !== "Individual Buyer"));
  const memberType = profile?.userType || null;
  const navSections = buildNavSections({ userType: memberType, isAdmin, activePath: "/profile" });
  const tabs = TABS.filter((t) => t.key !== "documents" || memberType === "farmer" || memberType === "institution");

  return (
    <AppShell
      title="Profile"
      subtitle="Your details, documents, password and privacy choices."
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
    >
      <div className="profile-hero aaf-card">
        <div className="profile-identity">
          <div className="profile-photo-wrap">
            <img src={profile?.profilePicture?.url || appIcon} alt={profile?.profilePicture?.url ? "Your profile photo" : ""} className="profile-photo" />
            <label className="profile-photo-edit" aria-label="Change profile photo" title="Change profile photo">
              {uploading ? "…" : <Pencil size={14} />}
              <input type="file" accept="image/*" onChange={uploadProfilePicture} disabled={uploading} hidden />
            </label>
          </div>

          <div>
            <h2>{name || profile?.personalInfo?.email || "AfriAgriFed User"}</h2>
            <span className="aaf-pill aaf-pill-success">{roleLabel({ userType: memberType, isOrganization, isAdmin })}</span>
          </div>
        </div>
      </div>

      <div className="profile-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`profile-tab ${tab === t.key ? "active" : ""}`}
            aria-pressed={tab === t.key}
            onClick={() => setTab(t.key)}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="profile-panels">
          <section className="aaf-card profile-section">
            <div className="profile-section-header">
              <h3>Personal information</h3>
              {!editingProfile && (
                <button className="aaf-btn aaf-btn-ghost" onClick={startEditProfile}>
                  <Pencil size={14} /> Edit
                </button>
              )}
            </div>

            {editingProfile ? (
              <div className="profile-edit-form">
                <label>
                  First name
                  <input
                    value={editForm.firstName}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, firstName: e.target.value }))}
                  />
                </label>
                <label>
                  Last name
                  <input
                    value={editForm.lastName}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, lastName: e.target.value }))}
                  />
                </label>
                <label>
                  Nationality
                  <input
                    value={editForm.nationality}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, nationality: e.target.value }))}
                  />
                </label>
                <label>
                  Gender
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, gender: e.target.value }))}
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <div className="profile-edit-actions">
                  <button className="aaf-btn aaf-btn-primary" onClick={saveProfile} disabled={savingProfile}>
                    <Check size={14} /> {savingProfile ? "Saving..." : "Save"}
                  </button>
                  <button className="aaf-btn aaf-btn-ghost" onClick={cancelEditProfile} disabled={savingProfile}>
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <InfoGrid data={profile.personalInfo} />
            )}
          </section>

          <section className="aaf-card profile-section">
            <h3>Account status</h3>
            <InfoGrid data={profile.accountStatus} />
          </section>

          <section className="aaf-card profile-section">
            <h3>Registration answers</h3>
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

      {tab === "privacy" && <PrivacyPanel profile={profile} />}

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
            Send password reset e-mail
          </button>
          {resetStatus && <p className="profile-reset-status">{resetStatus}</p>}
        </section>
      )}
    </AppShell>
  );
}
