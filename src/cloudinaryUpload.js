// Every photo and document upload goes through here.
//
// Two ways to reach Cloudinary, tried in this order:
//   1. Signed: our backend (server.js) signs the upload with the secret key.
//      Used whenever a backend address is configured and it answers.
//   2. Unsigned: straight from the browser with an "unsigned upload preset"
//      (REACT_APP_CLOUDINARY_CLOUD_NAME + REACT_APP_CLOUDINARY_UPLOAD_PRESET).
//      Needs no backend, so uploads keep working on the live site while the
//      backend is offline or not deployed yet. Restrict the preset in the
//      Cloudinary console (allowed formats, max file size); see .env.example.
//
// Uploads used to need the backend only, and the live site has none yet, so
// every upload failed with "being set up". That is what option 2 fixes.

import { API_BASE_URL, noBackendMessage } from "./apiBase";
import { t } from "./i18n";

const CLOUD_NAME = (process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "").trim();
const UPLOAD_PRESET = (process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "").trim();

export const MB = 1024 * 1024;

export const FILE_RULES = {
  image: {
    types: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"],
    maxBytes: 10 * MB,
    describeKey: "cloudinary.describeImage",
  },
  document: {
    types: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    maxBytes: 20 * MB,
    describeKey: "cloudinary.describeDocument",
  },
};

const unsignedAvailable = () => CLOUD_NAME !== "" && UPLOAD_PRESET !== "";

/** True when at least one upload route is set up for this build. */
export const uploadsConfigured = () => API_BASE_URL !== "" || unsignedAvailable();

/** Throws a readable error if the file is the wrong type or too big. */
export function checkFile(file, kind = "image") {
  if (!file) throw new Error(t("cloudinaryUpload.chooseFileFirst"));
  const rule = FILE_RULES[kind] || FILE_RULES.image;
  if (file.type && !rule.types.includes(file.type)) {
    const error = new Error(t("cloudinary.unsupported", { name: file.name, what: t(rule.describeKey) }));
    error.userError = true; // the person chose the wrong file: do not quietly try another route
    throw error;
  }
  if (file.size > rule.maxBytes) {
    throw new Error(t("cloudinary.tooBig", { name: file.name, mb: Math.round(rule.maxBytes / MB) }));
  }
}

// Cloudinary folder names: letters, numbers, "-", "_" and "/", nothing else.
export const cleanFolder = (folder) =>
  String(folder || "uploads").replace(/[^A-Za-z0-9/_-]/g, "").replace(/\/{2,}/g, "/").replace(/^\/|\/$/g, "") || "uploads";

// Cloudinary's own messages are always English; they are matched here and turned into
// text in the reader's language. userError marks the cases that are the person's file
// (too big, wrong type), as opposed to a setup problem we can work around.
function friendlyCloudinaryError(message) {
  const text = String(message || "");
  const error = (key) => Object.assign(new Error(t(key)), { userError: key === "cloudinary.serverTooLarge" || key === "cloudinary.serverUnsupported" });
  if (/upload preset/i.test(text)) return error("cloudinary.presetMissing");
  if (/cloud_name|unknown api key|invalid cloud/i.test(text)) return error("cloudinary.cloudNameWrong");
  if (/file size too large/i.test(text)) return error("cloudinary.serverTooLarge");
  if (/invalid image file|unsupported/i.test(text)) return error("cloudinary.serverUnsupported");
  return Object.assign(new Error(text || t("cloudinary.failed")), { userError: false });
}

async function sendToCloudinary(cloudName, resourceType, formData) {
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
    method: "POST",
    body: formData,
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    // Cloudinary always answers JSON; anything else is a network problem.
  }
  if (!response.ok) throw friendlyCloudinaryError(data.error?.message);
  return data; // { secure_url, public_id, ... }
}

async function signedUpload(file, folder, resourceType) {
  // A network failure here (backend asleep, not deployed, or not running
  // locally) is marked so the caller can fall back to an unsigned upload.
  let signatureResponse;
  try {
    signatureResponse = await fetch(`${API_BASE_URL}/api/cloudinary-signature?folder=${encodeURIComponent(folder)}`);
  } catch (error) {
    error.backendUnreachable = true;
    throw error;
  }
  if (!signatureResponse.ok) {
    const error = new Error(t("cloudinaryUpload.theUploadServiceIsNotResponding"));
    error.backendUnreachable = true;
    throw error;
  }
  const { timestamp, signature, apiKey, cloudName } = await signatureResponse.json();

  // These fields must match exactly what the server signed (timestamp + folder).
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("folder", folder);
  return sendToCloudinary(cloudName, resourceType, formData);
}

function unsignedUpload(file, folder, resourceType) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);
  return sendToCloudinary(CLOUD_NAME, resourceType, formData);
}

/**
 * Uploads a file and resolves with Cloudinary's answer ({ secure_url, public_id, ... }).
 * kind: "image" (photos) or "document" (PDF/Word/scan), which sets the size and type limits.
 */
export async function uploadToCloudinary(file, folder = "posts", { kind = "image" } = {}) {
  checkFile(file, kind);
  if (!uploadsConfigured()) throw new Error(noBackendMessage());

  const target = cleanFolder(folder);
  const resourceType = kind === "document" ? "auto" : "image";

  if (API_BASE_URL) {
    try {
      return await signedUpload(file, target, resourceType);
    } catch (error) {
      if (!error.backendUnreachable || !unsignedAvailable()) {
        throw error.backendUnreachable ? new Error(noBackendMessage()) : error;
      }
      // Backend unreachable but an unsigned preset exists: use it.
    }
  }
  return unsignedUpload(file, target, resourceType);
}

/** Documents (ID, certificates, statements, research PDFs). */
export const uploadDocumentToCloudinary = (file, folder = "documents") =>
  uploadToCloudinary(file, folder, { kind: "document" });
