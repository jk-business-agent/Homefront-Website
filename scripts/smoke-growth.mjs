// Tests newsletter growth boosters: signup incentive (welcome code), checkout source,
// product-page signup presence.
const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
const check = (n, c) => { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n}`); } };
const get = async (p, o) => { const r = await fetch(BASE + p, { headers: { "Content-Type": "application/json" }, ...o }); const ct = r.headers.get("content-type") || ""; return { status: r.status, body: ct.includes("json") ? await r.json().catch(() => ({})) : await r.text() }; };
const uniq = () => Math.floor(performance.now()) + "" + (performance.now() % 1000 | 0);

async function main() {
  console.log(`\nTesting newsletter growth boosters at ${BASE}\n`);

  // 1. Signup returns the welcome incentive code.
  const sub = await get("/api/newsletter/subscribe", { method: "POST", body: JSON.stringify({ email: `grow${uniq()}@demo.com`, source: "popup" }) });
  check("subscribe succeeds (201)", sub.status === 201);
  check("returns welcome code WELCOME10", sub.body.code === "WELCOME10");
  check("includes a discount label", typeof sub.body.label === "string" && sub.body.label.includes("10%"));

  // 2. The welcome code actually works as a discount.
  const v = await get("/api/coupons/validate", { method: "POST", body: JSON.stringify({ code: "WELCOME10", subtotalCents: 5000 }) });
  check("WELCOME10 is a valid coupon", v.body.valid === true);
  check("gives 10% off ($5 on $50)", v.body.discountCents === 500);

  // 3. Checkout is an accepted signup source.
  const co = await get("/api/newsletter/subscribe", { method: "POST", body: JSON.stringify({ email: `co${uniq()}@demo.com`, source: "checkout" }) });
  check("checkout source accepted", co.status === 201 && co.body.code === "WELCOME10");

  // 4. Product pages carry a newsletter signup (from the product template).
  const prods = (await get("/api/products")).body.products;
  const pd = await get(`/products/${prods[0].slug}`);
  check("product page includes a newsletter signup", pd.body.includes("you@email.com") || pd.body.includes("American-made picks"));

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
