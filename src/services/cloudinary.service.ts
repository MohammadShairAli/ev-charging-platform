import { createHash } from "node:crypto";
import { appConfig } from "@/src/lib/config";

type CloudinaryUploadResponse = {
  secure_url?: string;
  error?: {
    message?: string;
  };
};

function requireCloudinaryConfig() {
  const { cloudName, apiKey, apiSecret } = appConfig.cloudinary;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary configuration is missing. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.");
  }
}

function signUpload(timestamp: number, folder: string) {
  const payload = `folder=${folder}&timestamp=${timestamp}${appConfig.cloudinary.apiSecret}`;

  return createHash("sha1").update(payload).digest("hex");
}

export async function uploadProfileImage(imageDataUrl?: string | null) {
  if (!imageDataUrl) {
    return null;
  }

  requireCloudinaryConfig();

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = appConfig.cloudinary.uploadFolder;
  const form = new FormData();

  form.append("file", imageDataUrl);
  form.append("api_key", appConfig.cloudinary.apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("signature", signUpload(timestamp, folder));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${appConfig.cloudinary.cloudName}/image/upload`, {
    method: "POST",
    body: form,
    cache: "no-store",
  });
  const data = await response.json() as CloudinaryUploadResponse;

  if (!response.ok || !data.secure_url) {
    throw new Error(data.error?.message || "Cloudinary image upload failed.");
  }

  return data.secure_url;
}
