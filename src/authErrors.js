// Plain-language messages for sign-in and registration failures. Firebase's own
// messages read like "Firebase: Error (auth/invalid-credential)." and modern
// Firebase answers a wrong password with `auth/invalid-credential`, which the
// sign-in page used to show only as "Login failed."

const WRONG_LOGIN = "That e-mail and password do not match. Check them and try again, or reset your password.";

const MESSAGES = {
  // One message for "no such account" and "wrong password": it is clearer for the
  // person, and it does not reveal which e-mail addresses have accounts.
  "auth/invalid-credential": WRONG_LOGIN,
  "auth/invalid-login-credentials": WRONG_LOGIN,
  "auth/user-not-found": WRONG_LOGIN,
  "auth/wrong-password": WRONG_LOGIN,
  "auth/invalid-email": "That does not look like a valid e-mail address.",
  "auth/user-disabled": "This account has been disabled. Please contact support.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes, or reset your password.",
  "auth/network-request-failed": "Could not reach the server. Check your internet connection and try again.",
  "auth/email-already-in-use": "An account with this e-mail already exists. Try signing in instead.",
  "auth/weak-password": "Choose a stronger password (at least 6 characters).",
  "auth/operation-not-allowed": "Signing in with e-mail is not switched on yet. Please contact support.",
  "auth/requires-recent-login": "For your security, please sign in again and retry.",
  "permission-denied": "We could not save that. Please try again, and contact support if it keeps happening.",
};

export function friendlyAuthError(error, fallback = "Something went wrong. Please try again.") {
  return (error && MESSAGES[error.code]) || fallback;
}
