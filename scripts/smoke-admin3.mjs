// Admin bundle: approve-before-live, user management (suspend/role), audit log, exports.
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
  console.log(`\nTesting admin bundle at ${BASE}\n`);
  const admin = client();
  await admin("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@demo.com", password: "password123" }) });

  // 1. Approve-before-live
  console.log("1. Approve-before-live");
  const newSeller = client();
  const semail = `pending${Math.floor(performance.now())}@demo.com`;
  await newSeller("/api/auth/register", { method: "POST", body: JSON.stringify({ name: "Pending Maker", email: semail, password: "Str0ngP@ss!2026", role: "SELLER", storeName: "Pending Shop " + Math.floor(performance.now()) }) });
  const store = await newSeller("/api/seller/store");
  check("new seller starts unapproved (pending)", store.body.store.approved === false);
  // add a product -> should be hidden from storefront until approved
  const prod = await newSeller("/api/seller/products", { method: "POST", body: JSON.stringify({ name: "Pending Widget " + Math.floor(performance.now()), description: "x", priceCents: 1999, category: "Home", madeInState: "Ohio" }) });
  const guest = client();
  const hidden = await guest(`/api/products?search=${encodeURIComponent(prod.body.product.name)}`);
  check("pending seller's product is hidden from shoppers", !hidden.body.products.some((p) => p.id === prod.body.product.id));
  // admin approves
  const sellers = (await admin("/api/admin/sellers")).body.sellers;
  const pendingStore = sellers.find((s) => s.email === semail);
  check("admin sees the pending store", !!pendingStore && pendingStore.approved === false);
  await admin(`/api/admin/sellers/${pendingStore.id}`, { method: "PATCH", body: JSON.stringify({ approved: true }) });
  const live = await guest(`/api/products?search=${encodeURIComponent(prod.body.product.name)}`);
  check("after approval the product goes live", live.body.products.some((p) => p.id === prod.body.product.id));

  // 2. User management
  console.log("\n2. User management");
  check("non-admin blocked from users", (await client()("/api/admin/users")).status === 403);
  const users = (await admin("/api/admin/users?search=buyer@demo.com")).body.users;
  check("admin can search users", users.some((u) => u.email === "buyer@demo.com"));
  const buyerId = users.find((u) => u.email === "buyer@demo.com").id;
  // suspend the buyer
  await admin(`/api/admin/users/${buyerId}`, { method: "PATCH", body: JSON.stringify({ suspended: true }) });
  const blocked = await client()("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "buyer@demo.com", password: "password123" }) });
  check("suspended user cannot log in (403)", blocked.status === 403);
  await admin(`/api/admin/users/${buyerId}`, { method: "PATCH", body: JSON.stringify({ suspended: false }) });
  const ok = await client()("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "buyer@demo.com", password: "password123" }) });
  check("unsuspended user can log in again", ok.status === 200);
  const me = (await admin("/api/auth/me")).body.user;
  const selfBlock = await admin(`/api/admin/users/${me.id}`, { method: "PATCH", body: JSON.stringify({ suspended: true }) });
  check("admin cannot suspend their own account", selfBlock.status === 400);

  // 3. Audit log
  console.log("\n3. Audit log");
  const audit = (await admin("/api/admin/audit")).body.entries;
  check("audit log recorded admin actions", Array.isArray(audit) && audit.length > 0);
  check("audit captured the seller approval", audit.some((e) => e.action === "seller.approve"));
  check("audit captured the user suspend", audit.some((e) => e.action === "user.suspend"));

  // 4. Reports / exports
  console.log("\n4. Reports / exports");
  for (const t of ["orders", "sellers", "subscribers", "products"]) {
    const r = await admin(`/api/admin/export?type=${t}`);
    check(`export ${t} returns CSV`, r.ct.includes("csv") && typeof r.body === "string" && r.body.includes(","));
  }

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️ SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error("crashed:", e); process.exit(1); });
