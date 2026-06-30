// Encrypt/decrypt sensitive fields (e.g. tax IDs / W-9) at rest with AES-256-GCM.
// Ciphertext is tagged with a version prefix; legacy plaintext passes through unchanged.
import crypto from "crypto";

const PREFIX = "enc:v1:";
const hexKey = process.env.DATA_ENCRYPTION_KEY || "";
const KEY = hexKey.length === 64 ? Buffer.from(hexKey, "hex") : null; // 32 bytes

export function encryptField(plain: string | null | undefined): string | null {
  if (plain == null || plain === "") return plain ?? null;
  if (!KEY) return plain; // no key configured — store as-is (dev fallback)
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptField(value: string | null | undefined): string | null {
  if (value == null) return null;
  if (!value.startsWith(PREFIX)) return value; // legacy plaintext or empty
  if (!KEY) return value;
  try {
    const raw = Buffer.from(value.slice(PREFIX.length), "base64");
    const iv = raw.subarray(0, 12), tag = raw.subarray(12, 28), data = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return ""; // tampered or wrong key
  }
}
