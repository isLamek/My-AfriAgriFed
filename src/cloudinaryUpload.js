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

import { API_BASE_URL, NO_BACKEND_MESSAGE } from "./apiBase";

const CLOUD_NAME = (process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "").trim();
const UPLOAD_PRESET = (process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "").trim();

export const MB = 1024 * 1024;

export const FILE_RULES = {
  image: {
    types: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"],
    maxBytes: 10 * MB,
    describe: "a JPG, PNG, WebP or GIF photo",
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
    describe: "a PDF, Word document, JPG or PNG",
  },
};

const unsignedAvailable = () => CLOUD_NAME !== "" && UPLOAD_PRESET !== "";

/** True when at least one upload route is set up for this build. */
export const uploadsConfigured = () => API_BASE_URL !== "" || unsignedAvailable();

/** Throws a readable error if the file is the wrong type or too big. */
export function checkFile(file, kind = "image") {
  if (!file) throw new Error("Choose a file first.");
  const rule = FILE_RULES[kind] || FILE_RULES.image;
  if (file.type && !rule.types.includes(file.type)) {
    throw new Error(`"${file.name}" isn't supported. Please upload ${rule.describe}.`);
  }
  if (file.size > rule.maxBytes) {
    throw new Error(`"${file.name}" is larger than ${Math.round(rule.maxBytes / MB)} MB. Please upload a smaller file.`);
  }
}

// Cloudinary folder names: letters, numbers, "-", "_" and "/", nothing else.
export const cleanFolder = (folder) =>
  String(folder || "uploads").replace(/[^A-Za-z0-9/_-]/g, "").replace(/\/{2,}/g, "/").replace(/^\/|\/$/g, "") || "uploads";

function friendlyCloudinaryError(message) {
  const text = String(message || "");
  if (/upload preset/i.test(text)) {
    return "Uploads are not set up correctly (the Cloudinary upload preset is missing or not unsigned). Please tell the AfriAgriFed team.";
  }
  if (/file size too large/i.test(text)) return "That file is too large. Please upload a smaller one.";
  if (/invalid image file|unsupported/i.test(text)) return "That file type isn't supported. Please try a JPG, PNG or PDF.";
  return text || "The upload failed. Please try again.";
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
  if (!response.ok) throw new Error(friendlyCloudinaryError(data.error?.message));
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
    const error = new Error("The upload service is not responding. Please try again in a minute.");
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
  if (!uploadsConfigured()) throw new Error(NO_BACKEND_MESSAGE);

  const target = cleanFolder(folder);
  const resourceType = kind === "document" ? "auto" : "image";

  if (API_BASE_URL) {
    try {
      return await signedUpload(file, target, resourceType);
    } catch (error) {
      if (!error.backendUnreachable || !unsignedAvailable()) {
        throw error.backendUnreachable ? new Error(NO_BACKEND_MESSAGE) : error;
      }
      // Backend unreachable but an unsigned preset exists: use it.
    }
  }
  return unsignedUpload(file, target, resourceType);
}

/** Documents (ID, certificates, statements, research PDFs). */
export const uploadDocumentToCloudinary = (file, folder = "documents") =>
  uploadToCloudinary(file, folder, { kind: "document" });
