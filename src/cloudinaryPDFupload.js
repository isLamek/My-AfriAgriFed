// Documents (ID, certificates, research PDFs). See cloudinaryUpload.js.
import { uploadToCloudinary as upload } from "./cloudinaryUpload";

export const uploadPdfToCloudinary = (file, folder = "farmer-documents") => upload(file, folder, { kind: "document" });
