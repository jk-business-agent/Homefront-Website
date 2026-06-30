// Real end-to-end check: upload a REAL image through the app's /api/upload and
// confirm it lands in Cloudinary, then build an f_auto,q_auto optimized link.
const BASE = process.env.BASE || "http://localhost:3000";

async function main() {
  // Grab a real JPEG to upload.
  const imgRes = await fetch("https://res.cloudinary.com/demo/image/upload/sample.jpg");
  const bytes = Buffer.from(await imgRes.arrayBuffer());
  console.log("Fetched real test image:", bytes.length, "bytes");

  const login = await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "buyer@demo.com", password: "password123" }) });
  const cookie = (login.headers.get("set-cookie") || "").split(";")[0];

  const fd = new FormData();
  fd.append("file", new Blob([bytes], { type: "image/jpeg" }), "homefront-test.jpg");
  const res = await fetch(BASE + "/api/upload", { method: "POST", headers: { Cookie: cookie }, body: fd });
  const data = await res.json();

  console.log("\nHTTP status:", res.status);
  console.log("Returned URL:", data.url);

  if (typeof data.url === "string" && data.url.includes("res.cloudinary.com")) {
    const optimized = data.url.replace("/upload/", "/upload/f_auto,q_auto/");
    console.log("\n✅ Cloudinary is LIVE — the image is stored in the cloud.");
    console.log("Optimized (f_auto,q_auto) URL:\n" + optimized);
  } else {
    console.log("\n⚠️ Still using local storage — Cloudinary not active for the app. URL:", data.url);
  }
}
main().catch((e) => { console.error("ERROR:", e); process.exit(1); });
