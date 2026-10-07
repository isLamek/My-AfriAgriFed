import React, { useEffect, useRef, useState } from "react";
import { sendPasswordResetEmail, signOut, updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AtSign, BadgeCheck, CalendarDays, Camera, Check, Clock, FileText, Lock, MapPin, Paperclip, Pencil, UserRound, X,
} from "lucide-react";
import { auth, db } from "./firebaseConfig";
import { uploadToCloudinary } from "./cloudinairyUpload";
import { getAdminProfile } from "./admin";
import { buildNavSections } from "./navConfig";
import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import Avatar from "./Avatar";
import {
  BIO_MAX, COVERS, NAMIBIA_REGIONS, ROLE_LABELS, avatarDataUrl, coverFor, ensurePublicProfile, isUsernameFree,
  normalizeUsername, profileTextProblem, publicRole, savePublicProfile, starterCard, usernameProblem,
} from "./publicProfile";
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

// Account status in plain words instead of raw field names.
const STATUS_TEXT = {
  verified: ["Verified", "good"],
  approved: ["Approved", "good"],
  not_required: ["Not needed", "good"],
  pending: ["Waiting for review", "wait"],
  submitted: ["Sent, waiting for review", "wait"],
  rejected: ["Not approved", "bad"],
};

function StatusRow({ label, value }) {
  const [text, tone] = STATUS_TEXT[value] || [value ? formatLabel(String(value)) : "Not started", "wait"];
  return (
    <div className="profile-status-row">
      <span>{label}</span>
      <strong className={`profile-status ${tone}`}>
        {tone === "good" ? <BadgeCheck size={14} /> : <Clock size={14} />} {text}
      </strong>
    </div>
  );
}

const TABS = [
  { key: "about", label: "About", icon: <UserRound size={16} /> },
  { key: "documents", label: "Documents", icon: <FileText size={16} /> },
  { key: "security", label: "Security", icon: <Lock size={16} /> },
];

export default function Profile() {
  const navigate = useNavigate();
  const fileInput = useRef(null);
  const [account, setAccount] = useState(null);
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState("about");
  const [resetStatus, setResetStatus] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [nameCheck, setNameCheck] = useState({ state: "idle", message: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/signin", { replace: true });
        return;
      }
      const [snapshot, adminProfile] = await Promise.all([
        getDoc(doc(db, "users", user.uid)).catch(() => null),
        getAdminProfile(user),
      ]);
      setIsAdmin(!!adminProfile);
      setAccount(snapshot && snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : { personalInfo: { email: user.email } });
      setCard(await ensurePublicProfile(user, getAdminProfile));
      setLoading(false);
    };
    load();
  }, [navigate]);

  // Live "is this username free?" check while typing (waits for a pause).
  const typedName = editing && form ? normalizeUsername(form.username) : "";
  const savedName = card?.username || "";
  useEffect(() => {
    if (!editing) return undefined;
    const name = typedName;
    if (!name || name === savedName) {
      setNameCheck({ state: "idle", message: "" });
      return undefined;
    }
    const problem = usernameProblem(name);
    if (problem) {
      setNameCheck({ state: "bad", message: problem });
      return undefined;
    }
    setNameCheck({ state: "checking", message: "Checking..." });
    let live = true;
    const timer = setTimeout(() => {
      isUsernameFree(name, auth.currentUser?.uid)
        .then((free) => live && setNameCheck(free ? { state: "good", message: `@${name} is free` } : { state: "bad", message: `@${name} is taken` }))
        .catch(() => live && setNameCheck({ state: "idle", message: "" }));
    }, 400);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [editing, typedName, savedName]);

  const user = auth.currentUser;
  const role = card?.role || publicRole(account, isAdmin);
  const info = account?.personalInfo || {};

  // The card to build on: the saved one, or a fresh one from sign-up details.
  const base = () => card || starterCard(user, account, isAdmin);

  const startEdit = () => {
    setForm({
      firstName: info.firstName || "",
      lastName: info.lastName || "",
      displayName: card?.displayName || "",
      username: card?.username || "",
      bio: card?.bio || "",
      region: card?.region || "",
      cover: card?.cover || "",
      nationality: info.nationality || "",
      gender: info.gender || "",
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(null);
    setNameCheck({ state: "idle", message: "" });
  };

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = async () => {
    const personName = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(" ");
    const displayName = (form.displayName.trim() || personName).slice(0, 60);
    const username = normalizeUsername(form.username);
    const problem = profileTextProblem({ displayName, bio: form.bio }) || usernameProblem(username);
    if (problem) return toast.error(problem);
    if (nameCheck.state === "bad") return toast.error(nameCheck.message);

    setSaving(true);
    try {
      if (username && username !== (card?.username || "") && !(await isUsernameFree(username, user.uid))) {
        setNameCheck({ state: "bad", message: `@${username} is taken` });
        toast.error(`@${username} was just taken. Please pick another.`);
        return;
      }
      const personalInfo = {
        ...info,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        nationality: form.nationality.trim(),
        gender: form.gender,
      };
      if (account?.id) await updateDoc(doc(db, "users", user.uid), { personalInfo });
      const saved = await savePublicProfile(
        user.uid,
        { ...base(), displayName, username, bio: form.bio, region: form.region, cover: form.cover, role },
        card?.username || ""
      );
      // posts and comments fall back to the sign-in name, so keep it in step
      await updateProfile(user, { displayName }).catch(() => {});
      setAccount((prev) => ({ ...prev, personalInfo }));
      setCard({ uid: user.uid, ...saved });
      cancelEdit();
      toast.success("Profile saved.");
    } catch (error) {
      toast.error(error.code === "permission-denied" ? "That couldn't be saved. Check the username and bio, then try again." : error.message);
    } finally {
      setSaving(false);
    }
  };

  const changePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;
    setUploading(true);
    try {
      let photoURL;
      try {
        const result = await uploadToCloudinary(file, `afriagrifed/users/${user.uid}/profile`);
        photoURL = result.secure_url;
      } catch {
        // Uploads not set up (or offline to Cloudinary): keep a small copy instead.
        photoURL = await avatarDataUrl(file);
      }
      const saved = await savePublicProfile(user.uid, { ...base(), role, photoURL }, card?.username || "");
      if (account?.id) await updateDoc(doc(db, "users", user.uid), { profilePicture: { url: photoURL } }).catch(() => {});
      if (photoURL.startsWith("https://")) await updateProfile(user, { photoURL }).catch(() => {});
      setCard({ uid: user.uid, ...saved });
      toast.success("Profile picture updated.");
    } catch (error) {
      toast.error(error.message || "That photo couldn't be saved.");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    try {
      const saved = await savePublicProfile(user.uid, { ...base(), role, photoURL: "" }, card?.username || "");
      setCard({ uid: user.uid, ...saved });
      toast.success("Profile picture removed.");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const sendReset = async () => {
    if (!user?.email) return;
    setResetStatus("Sending...");
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetStatus(`Reset link sent to ${user.email}.`);
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

  const name = card?.displayName || [info.firstName, info.lastName].filter(Boolean).join(" ") || user?.email || "Member";
  const theme = isAdmin ? "admin" : role === "organization" ? "organization" : account?.userType;
  const navSections = buildNavSections({ userType: account?.userType, isAdmin, activePath: "/profile" });

  // What's still missing, so the member knows how to finish their profile.
  const todo = [
    !card?.photoURL && "a photo",
    !card?.username && "a username",
    !card?.bio && "a short bio",
    !card?.region && "your region",
  ].filter(Boolean);
  const complete = Math.round(((4 - todo.length) / 4) * 100);
  const cover = editing && form ? coverFor({ role, cover: form.cover }) : coverFor(card || { role });

  return (
    <AppShell
      eyebrow="Account"
      title="My Profile"
      subtitle="How other members see you, and your account details."
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
      theme={theme}
    >
      <section className="profile-hero aaf-card">
        <div className="profile-cover" style={{ backgroundImage: `url(${cover})` }} />

        <div className="profile-hero-body">
          <div className="profile-photo-wrap">
            <Avatar name={name} photoURL={card?.photoURL} size={112} className="profile-photo" />
            <button
              type="button"
              className="profile-photo-btn"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              aria-label="Change profile picture"
              title="Change profile picture"
            >
              {uploading ? <span className="profile-spinner" /> : <Camera size={16} />}
            </button>
            <input ref={fileInput} type="file" accept="image/*" onChange={changePhoto} hidden />
          </div>

          <div className="profile-identity">
            <h2>{name}</h2>
            <p className="profile-handle">
              {card?.username ? `@${card.username}` : <button type="button" className="profile-link" onClick={startEdit}>Choose a username</button>}
            </p>
            <div className="profile-meta">
              <span className="profile-role">{ROLE_LABELS[role] || "Member"}</span>
              {card?.region && <span><MapPin size={14} /> {card.region}</span>}
              {card?.memberSince && <span><CalendarDays size={14} /> Member since {card.memberSince}</span>}
            </div>
            {card?.bio && <p className="profile-bio">{card.bio}</p>}
          </div>

          {!editing && (
            <div className="profile-hero-actions">
              <button type="button" className="aaf-btn aaf-btn-primary" onClick={startEdit}>
                <Pencil size={14} /> Edit profile
              </button>
              {card?.photoURL && (
                <button type="button" className="aaf-btn aaf-btn-ghost" onClick={removePhoto}>
                  Remove photo
                </button>
              )}
            </div>
          )}
        </div>

        {todo.length > 0 && !editing && (
          <div className="profile-progress">
            <div className="profile-progress-bar"><span style={{ width: `${complete}%` }} /></div>
            <p>
              Your profile is {complete}% complete. Add {todo.join(", ").replace(/, ([^,]*)$/, " and $1")} so buyers and
              sellers know who they're dealing with.
            </p>
          </div>
        )}
      </section>

      {editing && form && (
        <section className="aaf-card profile-editor">
          <h3>Edit profile</h3>
          <div className="profile-edit-grid">
            <label>
              First name
              <input value={form.firstName} onChange={set("firstName")} maxLength={40} />
            </label>
            <label>
              Last name
              <input value={form.lastName} onChange={set("lastName")} maxLength={40} />
            </label>
            <label className="wide">
              Name shown to members
              <input value={form.displayName} onChange={set("displayName")} maxLength={60} placeholder="Your name, farm or business" />
              <small>Leave empty to use your first and last name.</small>
            </label>
            <label>
              Username
              <span className={`profile-at-field ${nameCheck.state}`}>
                <AtSign size={15} />
                <input
                  value={form.username}
                  onChange={(e) => setForm((prev) => ({ ...prev, username: normalizeUsername(e.target.value) }))}
                  maxLength={20}
                  placeholder="e.g. ndapewa_farms"
                  autoComplete="off"
                  spellCheck={false}
                />
              </span>
              <small className={`profile-name-check ${nameCheck.state}`} aria-live="polite">
                {nameCheck.message || "Letters, numbers and underscores. Others can find you by it."}
              </small>
            </label>
            <label>
              Region
              <select value={form.region} onChange={set("region")}>
                <option value="">Choose your region</option>
                {NAMIBIA_REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="wide">
              Bio
              <textarea
                value={form.bio}
                onChange={set("bio")}
                maxLength={BIO_MAX}
                rows={3}
                placeholder="What you farm, buy or research. No phone numbers or e-mails: members reach you through Messages."
              />
              <small>{form.bio.length}/{BIO_MAX}</small>
            </label>
            <label>
              Nationality
              <input value={form.nationality} onChange={set("nationality")} maxLength={40} />
            </label>
            <label>
              Gender
              <select value={form.gender} onChange={set("gender")}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>

            <fieldset className="wide profile-covers">
              <legend>Cover photo</legend>
              <div>
                {COVERS.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    className={`profile-cover-pick ${coverFor({ role, cover: form.cover }) === c.image ? "on" : ""}`}
                    style={{ backgroundImage: `url(${c.image})` }}
                    onClick={() => setForm((prev) => ({ ...prev, cover: c.id }))}
                    aria-pressed={coverFor({ role, cover: form.cover }) === c.image}
                  >
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="profile-edit-actions">
            <button type="button" className="aaf-btn aaf-btn-primary" onClick={save} disabled={saving}>
              <Check size={14} /> {saving ? "Saving..." : "Save profile"}
            </button>
            <button type="button" className="aaf-btn aaf-btn-ghost" onClick={cancelEdit} disabled={saving}>
              <X size={14} /> Cancel
            </button>
          </div>
        </section>
      )}

      <div className="profile-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`profile-tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "about" && (
        <div className="profile-panels">
          <section className="aaf-card profile-section">
            <h3>Personal details</h3>
            <p className="profile-private-note"><Lock size={13} /> Only you and the AfriAgriFed team see this.</p>
            <div className="profile-fields">
              <div className="profile-field"><span>Name</span><strong>{[info.firstName, info.lastName].filter(Boolean).join(" ") || "Not provided"}</strong></div>
              <div className="profile-field"><span>E-mail</span><strong>{user?.email}</strong></div>
              <div className="profile-field"><span>Nationality</span><strong>{info.nationality || "Not provided"}</strong></div>
              <div className="profile-field"><span>Gender</span><strong>{info.gender ? formatLabel(info.gender) : "Not provided"}</strong></div>
            </div>
          </section>

          <section className="aaf-card profile-section">
            <h3>Account status</h3>
            <StatusRow label="Registration" value={isAdmin ? "verified" : account?.accountStatus?.registrationStatus || account?.status} />
            <StatusRow label="Documents" value={isAdmin ? "not_required" : account?.accountStatus?.documentStatus} />
            <StatusRow label="E-mail" value={user?.emailVerified ? "verified" : "pending"} />
          </section>

          {account?.questionnaireData && Object.keys(account.questionnaireData).length > 0 && (
            <section className="aaf-card profile-section">
              <h3>Sign-up details</h3>
              <InfoGrid data={account.questionnaireData} />
            </section>
          )}
        </div>
      )}

      {tab === "documents" && (
        <section className="aaf-card profile-section">
          <h3>Documents</h3>
          {account?.documents && Object.values(account.documents).some((d) => d?.url) ? (
            <div className="profile-documents-grid">
              {Object.entries(account.documents).map(([docName, file]) =>
                file?.url ? (
                  <a key={docName} href={file.url} target="_blank" rel="noreferrer" className="profile-document-card">
                    <span><Paperclip size={18} /></span>
                    <div>
                      <strong>{formatLabel(docName)}</strong>
                      <p>{file.fileName || "View file"}</p>
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
            <span>E-mail</span>
            <strong>{user?.email}</strong>
          </div>
          <p className="profile-security-text">Send yourself a link to choose a new password.</p>
          <button type="button" className="aaf-btn aaf-btn-primary" onClick={sendReset}>
            Send password reset e-mail
          </button>
          {resetStatus && <p className="profile-reset-status">{resetStatus}</p>}
        </section>
      )}
    </AppShell>
  );
}
