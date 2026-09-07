const API_URL =
  process.env.REACT_APP_API_URL ||
  "http://localhost:3000";

export const uploadPdfToCloudinary = async (
  file,
  folder = "farmer-documents"
) => {

  const signatureResponse = await fetch(
    `${API_URL}/api/cloudinary-signature?folder=${folder}`
  );

  const {
    timestamp,
    signature,
    apiKey,
    cloudName
  } = await signatureResponse.json();

  const formData = new FormData();

  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("folder", folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
    {
      method: "POST",
      body: formData
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
      "PDF upload failed"
    );
  }

  return data;
};