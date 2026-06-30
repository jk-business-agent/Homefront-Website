// POST /api/upload — accept a photo/video file. Stores to Cloudinary when configured
// (production), otherwise to /public/uploads on local disk (dev).
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { requireUser } from "@/lib/auth";
import { cloudinaryEnabled, uploadToCloudinary } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime"];

// Inspect the first bytes ("magic numbers") to confirm the file really is the type
// it claims — a renamed .exe with image/png Content-Type won't pass this.
function sniffType(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif"; // GIF
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  // MP4 / QuickTime: an "ftyp" box near the start.
  if (buf.toString("ascii", 4, 8) === "ftyp") return "video/mp4";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Only images and short videos are allowed" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large (max 25 MB)" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Defense-in-depth: the real file contents must match an allowed type, not just
  // the (easily faked) Content-Type header.
  const sniffed = sniffType(bytes);
  const sniffedOk =
    sniffed === file.type ||
    (sniffed === "video/mp4" && file.type === "video/quicktime"); // both are ftyp/MOV-family
  if (!sniffed || !sniffedOk) {
    return NextResponse.json({ error: "That file doesn't look like a valid image or video." }, { status: 400 });
  }

  const kind = file.type.startsWith("video") ? "video" : "image";

  // Production: persist to Cloudinary so files survive on a read-only/ephemeral host.
  if (cloudinaryEnabled()) {
    const cloudUrl = await uploadToCloudinary(bytes, file.type);
    if (cloudUrl) return NextResponse.json({ url: cloudUrl, kind });
    // If the cloud upload fails, fall through to local storage rather than erroring.
  }

  // Dev fallback: write to /public/uploads on local disk.
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const filename = `${crypto.randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), bytes);

  return NextResponse.json({ url: `/uploads/${filename}`, kind });
}
