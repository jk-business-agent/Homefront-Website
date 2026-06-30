// Cloud image/video storage via Cloudinary. Configure CLOUDINARY_CLOUD_NAME +
// CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET in .env. When unset, uploads fall back
// to local disk (dev). With keys set, files persist in the cloud (required in
// production, where the server's filesystem is read-only/ephemeral).
import crypto from "crypto";

function creds() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME || "";
  const key = process.env.CLOUDINARY_API_KEY || "";
  const secret = process.env.CLOUDINARY_API_SECRET || "";
  return cloud && key && secret ? { cloud, key, secret } : null;
}

export function cloudinaryEnabled(): boolean {
  return creds() !== null;
}

// Upload raw bytes to Cloudinary with a signed request. Returns the secure URL,
// or null on failure (caller falls back to local storage).
export async function uploadToCloudinary(bytes: Buffer, mime: string): Promise<string | null> {
  const c = creds();
  if (!c) return null;
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "homefront";
    // Sign the params (sorted alphabetically) + the API secret.
    const toSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto.createHash("sha1").update(toSign + c.secret).digest("hex");

    const form = new FormData();
    form.append("file", new Blob([bytes], { type: mime }), "upload");
    form.append("api_key", c.key);
    form.append("timestamp", String(timestamp));
    form.append("folder", folder);
    form.append("signature", signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${c.cloud}/auto/upload`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.secure_url ?? null;
  } catch {
    return null;
  }
}
