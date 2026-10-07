// The public side of a member: what other members see next to their posts,
// messages and listings. Private details (e-mail, documents, approval state)
// stay in users/{uid}; this card lives in publicProfiles/{uid}.
//
// Usernames are unique: usernames/{name} holds { uid } and the rules only let
// a member point publicProfiles.username at a name they hold.

import { doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { checkForContactInfo } from "./contactGuard";
import farmingImg from "./images/farming.jpg";
import consumersImg from "./images/consumers.jpg";
import educatorsImg from "./images/educators.jpg";
import dataImg from "./images/farming-data.jpg";
import cattleImg from "./images/dash-cattle.jpg";
import namibiaImg from "./images/dash-namibia.jpg";
import marketImg from "./images/dash-market.jpg";
import grainsImg from "./images/dash-grains.jpg";

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const RESERVED = new Set(["admin", "admins", "afriagrifed", "afriagrfed", "support", "help", "system", "moderator", "staff", "official"]);
export const BIO_MAX = 160;
// Fired on window with the new card when a member saves their profile.
export const PROFILE_UPDATED_EVENT = "aaf-profile-updated";
export const NAME_MAX = 60;

export const NAMIBIA_REGIONS = [
  "Erongo", "Hardap", "//Kharas", "Kavango East", "Kavango West", "Khomas", "Kunene",
  "Ohangwena", "Omaheke", "Omusati", "Oshana", "Oshikoto", "Otjozondjupa", "Zambezi",
];

// Cover photos a member can pick for the top of their profile.
export const COVERS = [
  { id: "fields", label: "Green fields", image: farmingImg },
  { id: "cattle", label: "Cattle", image: cattleImg },
  { id: "land", label: "Namibian land", image: namibiaImg },
  { id: "market", label: "Market", image: marketImg },
  { id: "grain", label: "Grain", image: grainsImg },
  { id: "family", label: "Family table", image: consumersImg },
  { id: "lab", label: "Research", image: educatorsImg },
  { id: "data", label: "Smart farming", image: dataImg },
];
const DEFAULT_COVER = { farmer: "fields", consumer: "market", organization: "market", institution: "lab", admin: "data" };
export const coverFor = (profile) =>
  (COVERS.find((c) => c.id === profile?.cover) || COVERS.find((c) => c.id === DEFAULT_COVER[profile?.role]) || COVERS[0]).image;

export const ROLE_LABELS = { farmer: "Farmer", consumer: "Buyer", organization: "Organisation", institution: "Institution", admin: "Admin" };

/** Lower-case a typed username and drop a leading @. */
export const normalizeUsername = (value) => String(value || "").trim().replace(/^@/, "").toLowerCase();

/** null when fine, otherwise a sentence to show the member. */
export function usernameProblem(value) {
  const name = normalizeUsername(value);
  if (!name) return null; // a username is optional
  if (!USERNAME_PATTERN.test(name)) return "Use 3 to 20 letters, numbers or underscores (no spaces).";
  if (RESERVED.has(name)) return "That username is reserved. Please pick another.";
  if (/^[0-9_]+$/.test(name)) return "Include at least one letter.";
  return null;
}

/** null when fine, otherwise a sentence to show the member. */
export function profileTextProblem({ displayName, bio }) {
  const name = String(displayName || "").trim();
  if (!name) return "Please enter your name.";
  if (name.length > NAME_MAX) return `Keep your name under ${NAME_MAX} characters.`;
  if (String(bio || "").length > BIO_MAX) return `Keep your bio under ${BIO_MAX} characters.`;
  for (const text of [name, bio]) {
    const check = checkForContactInfo(text || "");
    if (!check.ok) return "Phone numbers, e-mails and links can't go on your public profile. Members reach you through Messages.";
  }
  return null;
}

/** The role shown on the profile, from the private account record. */
export function publicRole(account, isAdmin) {
  if (isAdmin) return "admin";
  const type = account?.userType || "consumer";
  if (type === "consumer") {
    const org =
      account?.isOrganization === true ||
      (!!account?.questionnaireData?.consumerType && account.questionnaireData.consumerType !== "Individual Buyer");
    return org ? "organization" : "consumer";
  }
  return type;
}

export async function isUsernameFree(name, uid) {
  const snap = await getDoc(doc(db, "usernames", name));
  return !snap.exists() || snap.data().uid === uid;
}

// A small in-memory cache so a feed of 30 posts by 5 people costs 5 reads.
const cache = new Map();

export function getPublicProfile(uid) {
  if (!uid) return Promise.resolve(null);
  if (!cache.has(uid)) {
    cache.set(
      uid,
      getDoc(doc(db, "publicProfiles", uid))
        .then((snap) => (snap.exists() ? { uid, ...snap.data() } : null))
        .catch(() => null)
    );
  }
  return cache.get(uid);
}

export function forgetPublicProfile(uid) {
  cache.delete(uid);
}

/**
 * Saves the member's public card. Claims a new username and frees the old
 * one in the same write, so two people can never end up with one name.
 */
export async function savePublicProfile(uid, next, previousUsername = "") {
  const username = normalizeUsername(next.username);
  const batch = writeBatch(db);
  if (username && username !== previousUsername) {
    batch.set(doc(db, "usernames", username), { uid });
  }
  if (previousUsername && previousUsername !== username) {
    batch.delete(doc(db, "usernames", previousUsername));
  }
  const card = {
    displayName: String(next.displayName || "").trim(),
    username,
    photoURL: next.photoURL || "",
    bio: String(next.bio || "").trim(),
    region: next.region || "",
    role: next.role,
    cover: next.cover || "",
    memberSince: next.memberSince || "",
    updatedAt: serverTimestamp(),
  };
  batch.set(doc(db, "publicProfiles", uid), card);
  await batch.commit();
  cache.set(uid, Promise.resolve({ uid, ...card }));
  window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, { detail: { uid, ...card } }));
  return card;
}

export const memberSinceLabel = (user) => {
  const created = user?.metadata?.creationTime ? new Date(user.metadata.creationTime) : null;
  return created && !Number.isNaN(created.getTime())
    ? created.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : "";
};

/** A first card built from what the member gave at sign-up. */
export function starterCard(user, account, isAdmin) {
  const info = account?.personalInfo || {};
  const fullName = [info.firstName, info.lastName].filter(Boolean).join(" ");
  const org = account?.questionnaireData?.businessName || account?.questionnaireData?.institutionName;
  const fallback = (user?.displayName || user?.email?.split("@")[0] || "Member").slice(0, NAME_MAX);
  const raw = String(org || fullName || fallback).trim().slice(0, NAME_MAX);
  // Never copy contact details from old sign-up data onto a public card.
  const displayName = checkForContactInfo(raw).ok ? raw : "Member";
  const photo = account?.profilePicture?.url || "";
  return {
    displayName,
    username: "",
    photoURL: /^https:\/\/res\.cloudinary\.com\//.test(photo) || /^data:image\/jpeg;base64,/.test(photo) ? photo : "",
    bio: "",
    region: NAMIBIA_REGIONS.includes(account?.questionnaireData?.region) ? account.questionnaireData.region : "",
    role: publicRole(account, isAdmin),
    cover: "",
    memberSince: memberSinceLabel(user),
  };
}

/**
 * Makes sure the signed-in member has a public card, creating one from their
 * sign-up details the first time. Runs once per session.
 */
let ensuring = null;
export function ensurePublicProfile(user, getAdmin) {
  if (!user) return Promise.resolve(null);
  if (ensuring && ensuring.uid === user.uid) return ensuring.promise;
  const promise = getPublicProfile(user.uid).then(async (existing) => {
    if (existing) return existing;
    const [snap, admin] = await Promise.all([getDoc(doc(db, "users", user.uid)).catch(() => null), getAdmin ? getAdmin(user) : null]);
    const account = snap && snap.exists() ? snap.data() : null;
    if (!account && !admin) return null; // still signing up
    forgetPublicProfile(user.uid);
    const card = starterCard(user, account, !!admin);
    return savePublicProfile(user.uid, card).then((saved) => ({ uid: user.uid, ...saved })).catch(() => null);
  });
  ensuring = { uid: user.uid, promise };
  return promise;
}

/**
 * Shrinks a photo to a square avatar (centre crop) as a JPEG data URL. Used
 * when Cloudinary uploads aren't set up, so profile pictures work for free;
 * a 256 px JPEG is roughly 15-30 KB.
 */
export function avatarDataUrl(file, size = 256, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) {
      reject(new Error("Please choose a photo (JPG or PNG)."));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      canvas
        .getContext("2d")
        .drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That photo couldn't be read. Please try another."));
    };
    img.src = url;
  });
}
