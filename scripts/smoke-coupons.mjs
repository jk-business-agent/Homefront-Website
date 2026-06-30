// End-to-end test for coupons: validate, admin CRUD, discount applied + stored on order.
const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n}`); } }
function client() {
  let ck = "";
  return async (p, o = {}) => {
    const r = await fetch(BASE + p, { ...o, headers: { "Content-Type": "application/json", ...(ck ? { Cookie: ck } : {}), ...(o.headers || {}) } });
    const sc = r.headers.get("set-cookie"); if (sc) ck = sc.split(";")[0];
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };
}

async function main() {
  console.log(`\nTesting coupons at ${BASE}\n`);
  const guest = client();

  // Validate seeded coupons
  const ten = await guest("/api/coupons/validate", { method: "POST", body: JSON.stringify({ code: "usa10", subtotalCents: 10000 }) });
  check("USA10 = 10% off $100 → $10", ten.body.valid && ten.body.discountCents === 1000);
  const min = await guest("/api/coupons/validate", { method: "POST", body: JSON.stringify({ code: "HOMEFRONT5", subtotalCents: 1000 }) });
  check("min-spend coupon rejected under threshold", min.body.valid === false);
  const ok5 = await guest("/api/coupons/validate", { method: "POST", body: JSON.stringify({ code: "HOMEFRONT5", subtotalCents: 5000 }) });
  check("HOMEFRONT5 = $5 off when over $25", ok5.body.valid && ok5.body.discountCents === 500);
  const bad = await guest("/api/coupons/validate", { method: "POST", body: JSON.stringify({ code: "NOPE", subtotalCents: 5000 }) });
  check("unknown code rejected", bad.body.valid === false);

  // Admin CRUD
  const admin = client();
  await admin("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@demo.com", password: "password123" }) });
  check("non-admin blocked", (await client()("/api/admin/coupons")).status === 403);
  const made = await admin("/api/admin/coupons", { method: "POST", body: JSON.stringify({ code: "TEST20", type: "PERCENT", value: 20 }) });
  check("admin creates coupon", made.status === 201);
  const off = await admin(`/api/admin/coupons/${made.body.coupon.id}`, { method: "PATCH", body: JSON.stringify({ active: false }) });
  check("admin turns coupon off", off.body.coupon.active === false);
  const afterOff = await guest("/api/coupons/validate", { method: "POST", body: JSON.stringify({ code: "TEST20", subtotalCents: 5000 }) });
  check("inactive coupon rejected", afterOff.body.valid === false);
  await admin(`/api/admin/coupons/${made.body.coupon.id}`, { method: "DELETE" });

  // Discount applied + stored on a real order
  const buyer = client();
  await buyer("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "buyer@demo.com", password: "password123" }) });
  const prod = (await buyer("/api/products")).body.products[0];
  const order = await buyer("/api/orders", { method: "POST", body: JSON.stringify({
    items: [{ productId: prod.id, quantity: 1 }],
    shipping: { fullName: "Demo Buyer", line1: "1 Test", city: "Denver", state: "CO", zip: "80014" },
    shippingService: "usps_ground", couponCode: "USA10",
  }) });
  check("order stores discount + code", order.status === 201 && order.body.order.couponCode === "USA10" && order.body.order.discountCents === Math.round(prod.priceCents * 0.1));
  const sub = prod.priceCents, tax = Math.round(sub * 0.07), disc = Math.round(sub * 0.1);
  check("order total reflects the discount", order.body.order.totalCents === sub + order.body.order.shippingCents + tax - disc);

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️ SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error("crashed:", e); process.exit(1); });
