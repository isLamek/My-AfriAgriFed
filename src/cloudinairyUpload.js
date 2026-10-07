// Older pages import uploads from here. The real work is in cloudinaryUpload.js,
// which uploads through the backend when there is one, or straight to Cloudinary
// with a free unsigned upload preset when there is not.
import { uploadToCloudinary as upload } from "./cloudinaryUpload";

// Photos get the photo rules (size, formats); anything else (PDF, Word, scans) the document rules.
export const uploadToCloudinary = (file, folder = "posts") =>
  upload(file, folder, { kind: file && /^image\//.test(file.type || "") ? "image" : "document" });
