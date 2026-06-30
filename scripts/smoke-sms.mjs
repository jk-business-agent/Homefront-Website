// Tests SMS opt-in: consent enforcement, phone validation/normalization, dedupe,
// landing page render, and admin CSV export.
const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
const check = (n, c) => { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n}`); } };
function client() {
  let ck = "";
  return async (p, o = {}) => {
    const r = await fetch(BASE + p, { ...o, headers: { "Content-Type": "application/json", ...(ck ? { Cookie: ck } : {}), ...(o.headers || {}) } });
    const sc = r.headers.get("set-cookie"); if (sc) ck = sc.split(";")[0];
    const ct = r.headers.get("content-type") || "";
    return { status: r.status, body: ct.includes("json") ? await r.json().catch(() => ({})) : await r.text() };
  };
}
const rand10 = () => "312" + String(Math.floor(Math.random() * 9000000) + 1000000);

async function main() {
  console.log(`\nTesting SMS opt-in at ${BASE}\n`);

  // 1. Consent is mandatory.
  const noConsent = await client()("/api/sms/subscribe", { method: "POST", body: JSON.stringify({ phone: rand10(), consent: false }) });
  check("rejects opt-in without consent (400)", noConsent.status === 400);

  // 2. Invalid phone rejected.
  const badPhone = await client()("/api/sms/subscribe", { method: "POST", body: JSON.stringify({ phone: "123", consent: true }) });
  check("rejects invalid phone (400)", badPhone.status === 400);

  // 3. Valid consented opt-in succeeds.
  const num = rand10();
  const ok = await client()("/api/sms/subscribe", { method: "POST", body: JSON.stringify({ phone: `(${num.slice(0,3)}) ${num.slice(3,6)}-${num.slice(6)}`, consent: true, source: "landing" }) });
  check("valid consented opt-in (201)", ok.status === 201);

  // 4. Duplicate number is a graceful no-op.
  const dup = await client()("/api/sms/subscribe", { method: "POST", body: JSON.stringify({ phone: num, consent: true }) });
  check("duplicate number handled", dup.status === 200 && dup.body.alreadySubscribed === true);

  // 5. Honeypot silently drops bots.
  const bot = await client()("/api/sms/subscribe", { method: "POST", body: JSON.stringify({ phone: rand10(), consent: true, website: "spam" }) });
  check("honeypot swallows bots", bot.status === 200);

  // 6. Landing page renders.
  const page = await client()("/p/text-deals");
  check("text-deals landing renders", page.status === 200 && /text deals|by text/i.test(page.body));
  check("landing has phone field + consent", page.body.includes('type="tel"') && page.body.includes("Reply STOP"));
  const nav = await client()("/api/pages/nav");
  check("in top nav", (nav.body.pages || []).some((p) => p.key === "text-deals"));

  // 7. Admin CSV export includes the consented number.
  const admin = client();
  await admin("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@demo.com", password: "password123" }) });
  const csv = await admin("/api/admin/export?type=sms");
  check("admin SMS export works", csv.status === 200 && typeof csv.body === "string" && csv.body.includes("Phone"));
  check("export contains the opted-in number", csv.body.includes(`+1${num}`));

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
