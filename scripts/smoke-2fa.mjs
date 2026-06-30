// End-to-end test for two-factor authentication (TOTP + backup codes).
import crypto from "crypto";
const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n}`); } }
function client() {
  let ck = "";
  return async (p, o = {}) => {
    const r = await fetch(BASE + p, { ...o, headers: { "Content-Type": "application/json", ...(ck ? { Cookie: ck } : {}), ...(o.headers || {}) } });
    const sc = r.headers.get("set-cookie"); if (sc) ck = sc.split(";")[0];
    const ct = r.headers.get("content-type") || "";
    return { status: r.status, ct, body: ct.includes("json") ? await r.json().catch(() => ({})) : await r.text() };
  };
}

// Inline TOTP generator matching src/lib/totp.ts.
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function b32decode(s) { s = s.toUpperCase().replace(/=+$/, ""); let bits = 0, val = 0; const out = []; for (const c of s) { const i = B32.indexOf(c); if (i < 0) continue; val = (val << 5) | i; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 0xff); bits -= 8; } } return Buffer.from(out); }
function totp(secret, atMs = Date.now()) {
  const key = b32decode(secret); const ctr = Math.floor(atMs / 1000 / 30);
  const buf = Buffer.alloc(8); buf.writeUInt32BE(Math.floor(ctr / 0x100000000), 0); buf.writeUInt32BE(ctr >>> 0, 4);
  const h = crypto.createHmac("sha1", key).update(buf).digest(); const o = h[h.length - 1] & 0xf;
  const code = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return (code % 1000000).toString().padStart(6, "0");
}
const uniq = () => Math.floor(performance.now()) + "" + (performance.now() % 1000 | 0);

async function main() {
  console.log(`\nTesting 2FA at ${BASE}\n`);
  const email = `tfa${uniq()}@demo.com`;
  const pw = "Str0ngP@ss!2026";

  console.log("1. Setup + enable");
  const c = client();
  const reg = await c("/api/auth/register", { method: "POST", body: JSON.stringify({ name: "TFA Tester", email, password: pw }) });
  check("register new user", reg.status === 201);
  check("2FA starts off", (await c("/api/account/2fa")).body.enabled === false);

  const setup = await c("/api/account/2fa/setup", { method: "POST" });
  check("setup returns a secret", typeof setup.body.secret === "string" && setup.body.secret.length >= 16);
  const secret = setup.body.secret;

  const wrongEnable = await c("/api/account/2fa/enable", { method: "POST", body: JSON.stringify({ token: "000000" }) });
  check("wrong code rejected on enable", wrongEnable.status === 400);

  const enable = await c("/api/account/2fa/enable", { method: "POST", body: JSON.stringify({ token: totp(secret) }) });
  check("enable with valid code (200)", enable.status === 200);
  check("returns 10 backup codes", Array.isArray(enable.body.backupCodes) && enable.body.backupCodes.length === 10);
  const backup = enable.body.backupCodes[0];
  check("2FA now reported on", (await c("/api/account/2fa")).body.enabled === true);

  console.log("2. Login now requires a code");
  const l1 = client();
  const step1 = await l1("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: pw }) });
  check("password-only login asks for 2FA (no session)", step1.body.twoFactorRequired === true && !step1.body.user);
  const me1 = await l1("/api/auth/me");
  check("no session created yet", !me1.body.user);

  const badCode = await l1("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: pw, token: "000000" }) });
  check("wrong 2FA code rejected (401)", badCode.status === 401);

  const good = await l1("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: pw, token: totp(secret) }) });
  check("correct code logs in", good.status === 200 && good.body.user?.email === email);

  console.log("3. Backup codes (single use)");
  const l2 = client();
  await l2("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: pw }) }); // trigger 2FA
  const byBackup = await l2("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: pw, token: backup }) });
  check("backup code logs in", byBackup.status === 200 && byBackup.body.user?.email === email);
  const reuse = client();
  await reuse("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: pw }) });
  const reuseRes = await reuse("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: pw, token: backup }) });
  check("used backup code can't be reused (401)", reuseRes.status === 401);

  console.log("4. Disable");
  // l1 is the signed-in client from step 2.
  const wrongDisable = await l1("/api/account/2fa/disable", { method: "POST", body: JSON.stringify({ token: "000000" }) });
  check("disable rejects wrong code", wrongDisable.status === 400);
  const disable = await l1("/api/account/2fa/disable", { method: "POST", body: JSON.stringify({ token: totp(secret) }) });
  check("disable with valid code", disable.status === 200);
  check("2FA reported off", (await l1("/api/account/2fa")).body.enabled === false);
  const plain = await client()("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: pw }) });
  check("login no longer needs a code", plain.status === 200 && plain.body.user?.email === email);

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
