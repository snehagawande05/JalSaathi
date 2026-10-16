import { randomUUID } from "node:crypto";
import path from "node:path";
import { supabase } from "../lib/supabase.js";
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES } from "../utils/constants.js";

const BUCKET_NAME = "issue-photos";

export function getPhotoPublicUrl(photoPath) {
  if (!photoPath) return null;
  if (photoPath.startsWith("http://") || photoPath.startsWith("https://")) {
    return photoPath;
  }
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(photoPath);
  return data?.publicUrl ?? null;
}

export async function uploadPhoto(file, userId) {
  if (!file) return null;

  if (!ALLOWED_PHOTO_TYPES.includes(file.mimetype)) {
    const error = new Error("Invalid image format. Allowed: JPG, PNG, WEBP");
    error.status = 400;
    error.code = "INVALID_FILE_TYPE";
    throw error;
  }

  if (file.size > MAX_PHOTO_BYTES) {
    const error = new Error("File exceeds 2 MB size limit");
    error.status = 400;
    error.code = "FILE_TOO_LARGE";
    throw error;
  }

  const ext = path.extname(file.originalname).toLowerCase() || (file.mimetype === "image/png" ? ".png" : file.mimetype === "image/webp" ? ".webp" : ".jpg");
  const filename = `${Date.now()}_${randomUUID()}${ext}`;
  const filePath = `${userId || "reports"}/${filename}`;

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });

  if (error) {
    const err = new Error(`Photo upload failed: ${error.message}`);
    err.status = 500;
    err.code = "STORAGE_ERROR";
    throw err;
  }

  return filePath;
}
