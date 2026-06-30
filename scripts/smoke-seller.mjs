// End-to-end test for seller onboarding (W-9), masking, CSV export, packing slips, admin visibility.
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

async function main() {
  console.log(`\nTesting seller bundle at ${BASE}\n`);

  // New seller onboarding + W-9
  console.log("1. Onboarding / W-9");
  const seller = client();
  const email = `w9test${Math.floor(performance.now())}@demo.com`;
  const reg = await seller("/api/auth/register", { method: "POST", body: JSON.stringify({ name: "W9 Tester", email, password: "Str0ngP@ss!2026", role: "SELLER", storeName: "W9 Test Shop" }) });
  check("seller registers", reg.status === 201);
  const before = await seller("/api/seller/store");
  check("new seller onboarding incomplete", before.body.store.onboardingComplete === false);
  const save = await seller("/api/seller/store", { method: "PATCH", body: JSON.stringify({
    legalName: "W9 Test Shop LLC", businessType: "LLC", taxIdType: "EIN", taxId: "12-3456789",
    legalLine1: "5 Main St", legalCity: "Austin", legalState: "TX", legalZip: "78701",
    w9Certify: true, w9Name: "Pat Owner", onboardingComplete: true,
  }) });
  check("W-9 saved + onboarding completed", save.body.store.onboardingComplete === true && !!save.body.store.w9AcceptedAt);
  check("tax ID is masked in response (last 4 only)", save.body.store.taxIdMasked === "••• •• 6789" && save.body.store.taxId === undefined);
  check("taxIdOnFile flag set", save.body.store.taxIdOnFile === true);

  // CSV export
  console.log("\n2. Order export + packing slip");
  const s5 = client();
  await s5("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "seller5@demo.com", password: "password123" }) });
  // place an order for seller5 first
  const buyer = client();
  await buyer("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "buyer@demo.com", password: "password123" }) });
  const bottle = (await buyer("/api/products?search=bottle")).body.products[0];
  const order = await buyer("/api/orders", { method: "POST", body: JSON.stringify({ items: [{ productId: bottle.id, quantity: 2 }], shipping: { fullName: "Demo Buyer", line1: "1 Test", city: "Denver", state: "CO", zip: "80014" }, shippingService: "usps_ground" }) });
  const csv = await s5("/api/seller/orders/export");
  check("CSV export returns text/csv", csv.ct.includes("csv") && csv.body.includes("Order,Date,Product"));
  const slip = await s5(`/seller/packing-slip/${order.body.order.id}`);
  check("packing slip page loads with items", slip.status === 200 && typeof slip.body === "string" && slip.body.includes("PACKING SLIP"));

  // Admin sees W-9 status (masked)
  console.log("\n3. Admin W-9 visibility");
  const admin = client();
  await admin("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@demo.com", password: "password123" }) });
  const sellers = (await admin("/api/admin/sellers")).body.sellers;
  check("admin list shows W-9 status", sellers.every((x) => "w9OnFile" in x) && sellers.some((x) => x.w9OnFile));
  const one = sellers.find((x) => x.w9OnFile);
  const detail = await admin(`/api/admin/sellers/${one.id}`);
  check("admin sees masked tax id (not raw)", typeof detail.body.store.taxIdMasked === "string" && detail.body.store.taxId === undefined);

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️ SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error("crashed:", e); process.exit(1); });
