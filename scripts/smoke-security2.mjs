// Tests for security pass 2: CSRF origin check, anti-spam honeypot, breached-password
// block, data export, account self-deletion, webhook (unsigned allowed in dev).
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
const uniq = () => Math.floor(performance.now()) + "" + Math.floor(performance.now() % 1000);

async function main() {
  console.log(`\nTesting security pass 2 at ${BASE}\n`);

  // 1. Breached/weak password is rejected on register
  console.log("1. Password strength");
  const c1 = client();
  const weak = await c1("/api/auth/register", { method: "POST", body: JSON.stringify({ name: "Weak", email: `weak${uniq()}@demo.com`, password: "password123" }) });
  check("weak password rejected (not 201)", weak.status === 400);
  const allNums = await c1("/api/auth/register", { method: "POST", body: JSON.stringify({ name: "Nums", email: `nums${uniq()}@demo.com`, password: "12345678" }) });
  check("all-numeric password rejected", allNums.status === 400);

  // 2. Honeypot — bot submission silently rejected
  console.log("2. Honeypot");
  const hp = await client()("/api/auth/register", { method: "POST", body: JSON.stringify({ name: "Bot", email: `bot${uniq()}@demo.com`, password: "Str0ngP@ss!2026", website: "http://spam.example" }) });
  check("honeypot-filled signup not created (not 201)", hp.status !== 201);

  // 3. Strong password registers fine (buyer for later steps)
  console.log("3. Strong password signup");
  const buyer = client();
  const bemail = `priv${uniq()}@demo.com`;
  const reg = await buyer("/api/auth/register", { method: "POST", body: JSON.stringify({ name: "Privacy Tester", email: bemail, password: "Str0ngP@ss!2026" }) });
  check("strong password signup succeeds (201)", reg.status === 201);

  // 4. CSRF — cross-site Origin is blocked on a mutating API call
  console.log("4. CSRF origin check");
  const csrf = await buyer("/api/account/profile", { method: "PATCH", headers: { Origin: "http://evil.example.com" }, body: JSON.stringify({ name: "Hacked" }) });
  check("cross-site Origin blocked (403)", csrf.status === 403);
  const sameOrigin = await buyer("/api/account/profile", { method: "PATCH", headers: { Origin: BASE }, body: JSON.stringify({ name: "Privacy Tester" }) });
  check("same-origin PATCH allowed (200)", sameOrigin.status === 200);

  // 5. Data export returns the user's data as a JSON download
  console.log("5. Data export");
  const exp = await buyer("/api/account/export");
  check("export returns JSON", exp.status === 200 && typeof exp.body === "object");
  check("export includes account + no password hash", exp.body?.account?.email === bemail && !("passwordHash" in (exp.body?.account || {})));

  // 6. Account self-deletion for a buyer with no orders
  console.log("6. Account deletion");
  const del = await buyer("/api/account", { method: "DELETE" });
  check("buyer (no orders) can delete account", del.status === 200 && del.body.deleted === true);
  const after = await buyer("/api/auth/login", { method: "POST", body: JSON.stringify({ email: bemail, password: "Str0ngP@ss!2026" }) });
  check("deleted account can no longer log in", after.status === 401);

  // 7. Seller account cannot self-delete (record retention)
  console.log("7. Seller delete guard");
  const seller = client();
  const semail = `selldel${uniq()}@demo.com`;
  await seller("/api/auth/register", { method: "POST", body: JSON.stringify({ name: "Seller Del", email: semail, password: "Str0ngP@ss!2026", role: "SELLER", storeName: "DelShop " + uniq() }) });
  const sdel = await seller("/api/account", { method: "DELETE" });
  check("seller self-delete blocked (409)", sdel.status === 409);

  // 8. Webhook still works in dev (no secret configured)
  console.log("8. Webhook (dev, unsigned)");
  const wh = await fetch(BASE + "/api/webhooks/easypost", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ result: { object: "Tracker", tracking_code: "NONEXISTENT", status: "delivered" } }) });
  check("unsigned webhook accepted in dev (200)", wh.status === 200);

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
