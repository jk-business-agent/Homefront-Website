// End-to-end test for admin management: dashboard stats, seller suspend/feature, product hide/feature.
const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n}`); } }
function client() {
  let ck = "";
  return async (p, o = {}) => {
    const r = await fetch(BASE + p, { ...o, headers: { "Content-Type": "application/json", ...(ck ? { Cookie: ck } : {}), ...(o.headers || {}) } });
    const sc = r.headers.get("set-cookie"); if (sc) ck = sc.split(";")[0];
    const ct = r.headers.get("content-type") || "";
    return { status: r.status, body: ct.includes("json") ? await r.json().catch(() => ({})) : await r.text() };
  };
}

async function main() {
  console.log(`\nTesting admin management at ${BASE}\n`);
  const guest = client();

  // non-admin blocked
  const buyer = client();
  await buyer("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "buyer@demo.com", password: "password123" }) });
  check("non-admin blocked from stats (403)", (await buyer("/api/admin/stats")).status === 403);

  const admin = client();
  await admin("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@demo.com", password: "password123" }) });

  // 1. Dashboard stats
  console.log("1. Dashboard");
  const stats = (await admin("/api/admin/stats")).body;
  check("stats returns totals", typeof stats.revenueCents === "number" && stats.sellerCount >= 11 && stats.buyerCount >= 1);
  check("stats has top products + recent orders arrays", Array.isArray(stats.topProducts) && Array.isArray(stats.recentOrders));

  // 2. Seller suspend hides products from storefront
  console.log("\n2. Seller management");
  const sellers = (await admin("/api/admin/sellers")).body.sellers;
  check("admin lists all sellers", sellers.length >= 11);
  const summit = sellers.find((s) => /summit/i.test(s.name));
  check("found a target seller", !!summit);
  // its product should be visible publicly now
  const before = (await guest("/api/products?search=bottle")).body.products;
  check("seller's product visible before suspend", before.some((p) => /bottle/i.test(p.name)));
  await admin(`/api/admin/sellers/${summit.id}`, { method: "PATCH", body: JSON.stringify({ approved: false }) });
  const during = (await guest("/api/products?search=bottle")).body.products;
  check("suspended seller's product hidden from storefront", !during.some((p) => /bottle/i.test(p.name)));
  await admin(`/api/admin/sellers/${summit.id}`, { method: "PATCH", body: JSON.stringify({ approved: true }) });
  const after = (await guest("/api/products?search=bottle")).body.products;
  check("re-approved seller's product visible again", after.some((p) => /bottle/i.test(p.name)));
  const feat = await admin(`/api/admin/sellers/${summit.id}`, { method: "PATCH", body: JSON.stringify({ featured: true }) });
  check("admin can feature a seller", feat.body.store?.featured === true);
  await admin(`/api/admin/sellers/${summit.id}`, { method: "PATCH", body: JSON.stringify({ featured: false }) });

  // 3. Product hide/feature
  console.log("\n3. Product management");
  const products = (await admin("/api/admin/products?search=boots")).body.products;
  check("admin lists products", products.length >= 1);
  const boots = products.find((p) => /boots/i.test(p.name));
  await admin(`/api/admin/products/${boots.id}`, { method: "PATCH", body: JSON.stringify({ active: false }) });
  const hidden = (await guest("/api/products?search=boots")).body.products;
  check("hidden product disappears from storefront", !hidden.some((p) => p.id === boots.id));
  await admin(`/api/admin/products/${boots.id}`, { method: "PATCH", body: JSON.stringify({ active: true }) });
  const shown = (await guest("/api/products?search=boots")).body.products;
  check("shown product reappears", shown.some((p) => p.id === boots.id));

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️ SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error("crashed:", e); process.exit(1); });
