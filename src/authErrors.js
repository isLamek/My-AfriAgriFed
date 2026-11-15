// Plain-language messages for sign-in and registration failures. Firebase's own
// messages read like "Firebase: Error (auth/invalid-credential)." and modern
// Firebase answers a wrong password with `auth/invalid-credential`, which the
// sign-in page used to show only as "Login failed."

import { t } from "./i18n";

const WRONG_LOGIN = "authErrors.wrongLogin";

// error code -> catalog key (the text is read when the error happens, in the visitor's language)
const MESSAGES = {
  // One message for "no such account" and "wrong password": it is clearer for the
  // person, and it does not reveal which e-mail addresses have accounts.
  "auth/invalid-credential": WRONG_LOGIN,
  "auth/invalid-login-credentials": WRONG_LOGIN,
  "auth/user-not-found": WRONG_LOGIN,
  "auth/wrong-password": WRONG_LOGIN,
  "auth/invalid-email": "authErrors.invalidEmail",
  "auth/user-disabled": "authErrors.userDisabled",
  "auth/too-many-requests": "authErrors.tooManyRequests",
  "auth/network-request-failed": "authErrors.networkFailed",
  "auth/email-already-in-use": "authErrors.emailInUse",
  "auth/weak-password": "authErrors.weakPassword",
  "auth/operation-not-allowed": "authErrors.operationNotAllowed",
  "auth/requires-recent-login": "authErrors.requiresRecentLogin",
  "permission-denied": "authErrors.permissionDenied",
};

export function friendlyAuthError(error, fallback = t("authErrors.somethingWentWrongPleaseTryAgain")) {
  const key = error && MESSAGES[error.code];
  return key ? t(key) : fallback;
}
