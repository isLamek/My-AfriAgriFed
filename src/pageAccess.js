// pageAccess.js
//
// Gate for the concept note's "provision of data and statistics for
// personal use is charged for if you are not registered" rule: registered
// (real, non-anonymous) accounts always get in for free; a visitor with no
// account gets a paywall offering three ways in - sign in/register (free),
// pay N$5 for this page, or self-verify as a student for free access.
//
// Anonymous visitors are given a real (if anonymous) Firebase Auth identity
// via signInAnonymously so their unlock can be recorded against a stable
// uid in Firestore (pageAccess/{uid}) instead of a spoofable localStorage
// flag. Same caveat as every other payment-verification path in this app
// (see server.js / FIREBASE.md): without Cloud Functions + the Admin SDK,
// the actual grant is written by the client after a Flutterwave verify
// call, not by a trusted server - consistent with how orders/promotions
// already work here, not a new weaker spot.

import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";

/**
 * Resolves once we know who's looking at the page: a real signed-in user,
 * or an anonymous one (creating the anonymous identity if none exists yet).
 */
export function ensureViewer() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        resolve(user);
        return;
      }
      try {
        const cred = await signInAnonymously(auth);
        resolve(cred.user);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/** True if this user should see the page for free: any real (non-anonymous) account. */
export function isRegistered(user) {
  return !!user && !user.isAnonymous;
}

export async function hasPaidOrVerifiedAccess(uid, pageKey) {
  const snap = await getDoc(doc(db, "pageAccess", uid));
  if (!snap.exists()) return false;
  const data = snap.data();
  return data[pageKey] === true || data.studentVerified === true;
}
