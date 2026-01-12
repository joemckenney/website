import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { config } from "../config.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get the encryption key from environment
 * Key should be 32 bytes (64 hex characters) for AES-256
 */
function getKey(): Buffer {
  const key = config.encryptionKey;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is required");
  }

  // If key is hex-encoded (64 chars for 32 bytes)
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, "hex");
  }

  // If key is a string, hash it to get 32 bytes
  const crypto = require("node:crypto");
  return crypto.createHash("sha256").update(key).digest();
}

/**
 * Encrypt a string value using AES-256-GCM
 * Returns: base64(iv + authTag + ciphertext)
 */
export function encrypt(text: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + ciphertext
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, "hex"),
  ]);

  return combined.toString("base64");
}

/**
 * Decrypt a string value encrypted with encrypt()
 */
export function decrypt(encryptedBase64: string): string {
  const key = getKey();
  const combined = Buffer.from(encryptedBase64, "base64");

  // Extract IV, authTag, and ciphertext
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext.toString("hex"), "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
