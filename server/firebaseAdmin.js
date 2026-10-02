// Firebase Admin access for the backend: lets the server read listings, verify
// who is calling (Firebase ID tokens) and write orders. Without credentials this
// returns null and payments stay switched off (the server refuses to take money
// it could not record).
//
// Credentials, either way (never commit them):
//   FIREBASE_SERVICE_ACCOUNT_JSON  the service-account JSON, pasted as one line
//                                  (or base64 of it, which survives awkward dashboards)
//   FIREBASE_SERVICE_ACCOUNT_FILE  path to the key file (local development)
// Get the key in Firebase console: Project settings, Service accounts, Generate new private key.

const fs = require("fs");
const { adminStore } = require("./store");

/** Read the service account from the environment, or return { error } / { missing: true }. */
function parseServiceAccount(env) {
  try {
    const raw = (env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim();
    if (raw) {
      const text = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
      return { account: validate(JSON.parse(text)) };
    }
    const file = (env.FIREBASE_SERVICE_ACCOUNT_FILE || "").trim();
    if (file) return { account: validate(JSON.parse(fs.readFileSync(file, "utf8"))) };
  } catch (error) {
    return { error: `Could not read the Firebase service account: ${error.message}` };
  }
  return { missing: true };
}

function validate(account) {
  if (!account || account.type !== "service_account" || !account.project_id || !account.private_key || !account.client_email) {
    throw new Error("it is not a service-account key (it needs type, project_id, private_key and client_email)");
  }
  return account;
}

function initAdmin(env = process.env, { log = console, requireImpl = require } = {}) {
  const parsed = parseServiceAccount(env);
  if (parsed.error) {
    log.error(parsed.error);
    return null;
  }
  if (parsed.missing) return null;

  // firebase-admin 12+ is modular: separate entry points for app, auth and firestore.
  const { initializeApp, getApps, cert } = requireImpl("firebase-admin/app");
  const { getAuth } = requireImpl("firebase-admin/auth");
  const { getFirestore, FieldValue } = requireImpl("firebase-admin/firestore");

  const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(parsed.account) });
  return {
    projectId: parsed.account.project_id,
    store: adminStore(getFirestore(app), FieldValue),
    async verifyToken(idToken) {
      const decoded = await getAuth(app).verifyIdToken(idToken);
      return {
        uid: decoded.uid,
        email: decoded.email || "",
        name: decoded.name || "",
        anonymous: decoded.firebase?.sign_in_provider === "anonymous",
      };
    },
  };
}

module.exports = { initAdmin, parseServiceAccount };
