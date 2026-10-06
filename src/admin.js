// admin.js
//
// Admin access control.
//
// Two ways an account becomes an admin:
//   1. Legacy:  admin/<uid>            (existing documents keep working)
//   2. Current: admins/<lowercase email>  { role: "founder" | "developer" | "moderator", ... }
//
// The email-based collection is the one the in-app Admin Dashboard manages,
// because it lets a founder grant access to a teammate's email address before
// that person has ever signed in (no UID needed up front).

import { doc, getDoc, setDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "./firebaseConfig";

export const ADMIN_ROLES = {
  FOUNDER: "founder",
  DEVELOPER: "developer",
  MODERATOR: "moderator",
};

// Emails that should automatically become founders the moment they sign in,
// as long as nobody has claimed the founder seat yet. This is just the
// initial bootstrap - once a founder exists, use the Admin Dashboard's
// "Grant Access" panel to add more people instead of editing this list.
export const PRESET_FOUNDER_EMAILS = ["lamekshaliindongo@gmail.com"];

const normalizeEmail = (email) => (email || "").trim().toLowerCase();

/**
 * Accepts either a raw uid string (legacy call sites) or a Firebase Auth
 * user object ({ uid, email }). Returns { uid, email } either way.
 */
const resolveIdentity = (userOrUid) => {
  if (!userOrUid) return { uid: null, email: null };

  if (typeof userOrUid === "string") {
    return { uid: userOrUid, email: null };
  }

  return {
    uid: userOrUid.uid || null,
    email: normalizeEmail(userOrUid.email),
  };
};

/**
 * Look up the admin profile for the current identity, or null if the
 * account is not an admin. Checks the email-keyed collection first (it
 * carries the role), then falls back to the legacy uid-keyed collection.
 */
export const getAdminProfile = async (userOrUid) => {
  const { uid, email } = resolveIdentity(userOrUid);

  if (!uid && !email) return null;

  try {
    if (email) {
      const emailSnap = await getDoc(doc(db, "admins", email));

      if (emailSnap.exists()) {
        const data = emailSnap.data();

        // Self-heal: attach the uid once we see it, so future lookups /
        // security rules keyed on uid keep working without manual upkeep.
        if (uid && data.uid !== uid) {
          setDoc(
            doc(db, "admins", email),
            { uid, linkedAt: serverTimestamp() },
            { merge: true }
          ).catch(() => {});
        }

        return {
          email,
          uid: data.uid || uid || null,
          role: data.role || ADMIN_ROLES.DEVELOPER,
          source: "admins",
        };
      }
    }

    if (uid) {
      const uidSnap = await getDoc(doc(db, "admin", uid));

      if (uidSnap.exists()) {
        return {
          email: email || uidSnap.data()?.email || null,
          uid,
          role: uidSnap.data()?.role || ADMIN_ROLES.DEVELOPER,
          source: "admin",
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Admin check failed:", error);
    return null;
  }
};

/**
 * Check if the currently logged in user is an admin.
 * `userOrUid` may be a uid string (legacy) or a Firebase Auth user object.
 */
export const isAdmin = async (userOrUid) => {
  const profile = await getAdminProfile(userOrUid);
  return !!profile;
};

/** Only founders can add or remove other admins. */
export const canManageAdmins = (role) => role === ADMIN_ROLES.FOUNDER;

/**
 * Grants the founder seat to `user`'s email in one atomic write. Firestore
 * rules only allow this to succeed while nobody has claimed the seat yet
 * (or if `user` is already a founder granting themselves again, a no-op).
 */
export const claimFounderSeat = async (user) => {
  if (!user?.email) throw new Error("No signed-in user to grant access to.");

  const email = normalizeEmail(user.email);
  const batch = writeBatch(db);

  batch.set(doc(db, "admins", email), {
    email,
    uid: user.uid,
    role: ADMIN_ROLES.FOUNDER,
    addedBy: "bootstrap",
    addedAt: serverTimestamp(),
  });

  batch.set(
    doc(db, "system", "bootstrap"),
    { founderClaimed: true, claimedBy: email, claimedAt: serverTimestamp() },
    { merge: true }
  );

  await batch.commit();
};

/**
 * Call right after sign-in/sign-up. If this email is on the preset founder
 * list and the founder seat is still unclaimed, grants it automatically.
 * Safe to call every time - no-ops once an admin profile already exists.
 *
 * Returns { claimed, error } instead of throwing, so callers can show the
 * user *why* it didn't work (most commonly: Firestore security rules for
 * this project haven't been deployed yet, so every write is denied) rather
 * than silently leaving them without access with no clue why.
 */
export const autoClaimPresetAdmin = async (user) => {
  if (!user?.email) return { claimed: false };

  const email = normalizeEmail(user.email);
  if (!PRESET_FOUNDER_EMAILS.includes(email)) return { claimed: false };

  const already = await getAdminProfile(user);
  if (already) return { claimed: false };

  try {
    await claimFounderSeat(user);
    return { claimed: true };
  } catch (error) {
    console.warn("Auto admin claim skipped:", error.message);

    const isPermissionError =
      error.code === "permission-denied" || /permission/i.test(error.message || "");

    return {
      claimed: false,
      error: isPermissionError
        ? "This email is set up for admin access, but the grant was blocked by Firestore security rules. Deploy firestore.rules (see FIREBASE.md) and sign in again."
        : error.message,
    };
  }
};
