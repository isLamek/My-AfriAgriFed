// Set REACT_APP_API_URL in your frontend .env, e.g.
//   REACT_APP_API_URL=http://localhost:5000
// In production point it at your deployed server.
const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

export const uploadToCloudinary = async (file, folder = "posts") => {
  if (!file) {
    throw new Error("No file provided");
  }

  // 1) Ask our server for a signed upload payload
  const signatureResponse = await fetch(
    `${API_URL}/api/cloudinary-signature?folder=${encodeURIComponent(folder)}`
  );


  

  if (!signatureResponse.ok) {
    throw new Error("Failed to get Cloudinary signature");
  }

  const { timestamp, signature, apiKey, cloudName } =  await signatureResponse.json();;

  // 2) Send the file directly to Cloudinary.
  // The fields here must match exactly what the server signed.
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("folder", folder);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    { method: "POST", body: formData }
  );

  const data = await uploadResponse.json();

  if (!uploadResponse.ok) {
    console.error(data);
    throw new Error(
      data.error?.message || "Cloudinary upload failed"
    );
  }

  return data; // { secure_url, public_id, ... }
};
