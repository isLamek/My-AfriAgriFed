// Email verification. Firebase lets anyone sign up with any e-mail address
// without proving they own it, so admin rights (which are granted to an e-mail
// address) only count once that address is verified (see firestore.rules).
//
// Everyone is asked to verify; only admins are blocked until they do.

import { sendEmailVerification } from "firebase/auth";

export const RESEND_COOLDOWN_MS = 60 * 1000; // Firebase also rate-limits, so don't hammer it

/** A real (not anonymous) account with an e-mail address that has not been verified. */
export const needsVerification = (user) => !!user && !user.isAnonymous && !!user.email && !user.emailVerified;

/** Milliseconds until another e-mail may be sent (0 = now). */
export function cooldownLeftMs(lastSentMs, now = Date.now(), cooldownMs = RESEND_COOLDOWN_MS) {
  if (!lastSentMs) return 0;
  return Math.max(0, lastSentMs + cooldownMs - now);
}

const key = (uid) => `aaf_verify_sent:${uid}`;

function lastSent(uid) {
  try {
    return Number(localStorage.getItem(key(uid))) || 0;
  } catch {
    return 0;
  }
}

function rememberSent(uid, when) {
  try {
    localStorage.setItem(key(uid), String(when));
  } catch {
    // private browsing: the cooldown just won't survive a reload
  }
}

/**
 * Send the verification e-mail. Resolves { sent: true }, or { sent: false,
 * waitMs } when one went out a moment ago, or { sent: false, error } with a
 * plain-language reason. Never throws.
 */
export async function sendVerification(user, now = Date.now()) {
  if (!needsVerification(user)) return { sent: false, error: "This account does not need verifying." };

  const waitMs = cooldownLeftMs(lastSent(user.uid), now);
  if (waitMs > 0) return { sent: false, waitMs };

  try {
    await sendEmailVerification(user);
    rememberSent(user.uid, now);
    return { sent: true };
  } catch (error) {
    const message =
      error && error.code === "auth/too-many-requests"
        ? "Too many requests. Please wait a few minutes and try again."
        : "We could not send the e-mail. Check your connection and try again.";
    return { sent: false, error: message };
  }
}

/**
 * After the person clicks the link in their e-mail: re-read the account and, if it
 * is now verified, refresh the sign-in token. The database rules read the verified
 * flag from the token, which is otherwise only renewed about hourly.
 */
export async function checkVerified(user) {
  if (!user) return false;
  try {
    await user.reload();
    if (!user.emailVerified) return false;
    await user.getIdToken(true);
    return true;
  } catch {
    return false;
  }
}
