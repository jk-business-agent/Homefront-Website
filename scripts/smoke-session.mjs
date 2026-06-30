// Tests for session controls: "log out everywhere" (token invalidation) + activity log.
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
const uniq = () => Math.floor(performance.now()) + "" + (performance.now() % 1000 | 0);

async function main() {
  console.log(`\nTesting session controls at ${BASE}\n`);
  const email = `sess${uniq()}@demo.com`;
  const pw = "Str0ngP@ss!2026";
  const reg = client();
  await reg("/api/auth/register", { method: "POST", body: JSON.stringify({ name: "Session Tester", email, password: pw }) });

  console.log("1. Login is recorded as activity");
  // Two "devices" both sign in.
  const devA = client();
  await devA("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: pw }) });
  const devB = client();
  await devB("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: pw }) });
  const evs = await devA("/api/account/security-events");
  check("security events list returns logins", (evs.body.events || []).some((e) => e.type === "login"));
  check("both sign-ins are valid", (await devA("/api/auth/me")).body.user?.email === email && (await devB("/api/auth/me")).body.user?.email === email);

  console.log("2. Log out everywhere invalidates other devices");
  const out = await devB("/api/account/logout-all", { method: "POST" });
  check("logout-all succeeds", out.status === 200);
  check("device A's old session is now invalid", !(await devA("/api/auth/me")).body.user);
  check("device B (initiator) is signed out too", !(await devB("/api/auth/me")).body.user);

  console.log("3. Can sign back in afterward");
  const devC = client();
  const relog = await devC("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: pw }) });
  check("re-login works after logout-all", relog.status === 200 && relog.body.user?.email === email);
  check("new session is valid", (await devC("/api/auth/me")).body.user?.email === email);
  const logoutAllEvent = (await devC("/api/account/security-events")).body.events || [];
  check("logout-all was recorded", logoutAllEvent.some((e) => e.type === "logout_all"));

  console.log("4. Activity endpoint requires auth");
  const anon = await client()("/api/account/security-events");
  check("signed-out blocked (401)", anon.status === 401);

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
