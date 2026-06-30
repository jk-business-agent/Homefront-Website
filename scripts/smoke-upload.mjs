// Verifies the upload route: auth required, magic-byte validation, and local-disk
// fallback when Cloudinary isn't configured.
const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
const check = (n, c) => { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n}`); } };

// A tiny but valid PNG (signature + IHDR-ish bytes; >12 bytes so the sniffer runs).
const PNG = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00,0x00,0x00,0x0d,0x49,0x48,0x44,0x52,0,0,0,1,0,0,0,1,8,6,0,0,0]);

async function login() {
  const r = await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "buyer@demo.com", password: "password123" }) });
  return (r.headers.get("set-cookie") || "").split(";")[0];
}

async function main() {
  console.log(`\nTesting uploads at ${BASE}\n`);

  // Unauthenticated upload is blocked.
  const anon = await fetch(BASE + "/api/upload", { method: "POST", body: new FormData() });
  check("upload requires sign-in (401)", anon.status === 401);

  const cookie = await login();

  // Valid PNG → stored, returns a URL.
  const fd = new FormData();
  fd.append("file", new Blob([PNG], { type: "image/png" }), "test.png");
  const ok = await fetch(BASE + "/api/upload", { method: "POST", headers: { Cookie: cookie }, body: fd });
  const okData = await ok.json();
  check("valid PNG uploads (200)", ok.status === 200);
  check("returns a usable URL + kind", typeof okData.url === "string" && okData.kind === "image");
  check("returns a stored path (cloud or local)", typeof okData.url === "string" && (okData.url.startsWith("/uploads/") || okData.url.includes("res.cloudinary.com")));

  // A fake image (text claiming to be PNG) is rejected by the magic-byte check.
  const bad = new FormData();
  bad.append("file", new Blob([Buffer.from("not really an image")], { type: "image/png" }), "fake.png");
  const badRes = await fetch(BASE + "/api/upload", { method: "POST", headers: { Cookie: cookie }, body: bad });
  check("fake/mismatched file rejected (400)", badRes.status === 400);

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
