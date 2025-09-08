import crypto from "crypto";

// Simple AES-256-GCM encryption helpers for sensitive config values
// Uses JWT_SECRET as key material to avoid introducing new env vars

function getKey(): Buffer {
  const secret = process.env.JWT_SECRET || "development-secret-key-please-change";
  // Derive 32-byte key from JWT_SECRET
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(plaintext?: string): string | undefined {
  if (!plaintext) return plaintext;
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(value?: string): string | undefined {
  if (!value) return value;
  if (!value.startsWith("enc:v1:")) return value; // Not encrypted
  const [, , ivB64, tagB64, dataB64] = value.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const key = getKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}
