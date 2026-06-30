// Tests: support chat (visitor↔admin), full seller/product edit, dashboard charts data.
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
  console.log(`\nTesting admin batch 2 at ${BASE}\n`);

  // ---- Support chat ----
  console.log("1. Support chat (visitor → us)");
  const guest = client();
  const start = await guest("/api/support", { method: "POST", body: JSON.stringify({ name: "Pat Visitor", email: "pat@example.com", body: "Do you ship to Alaska?" }) });
  check("visitor starts a support thread", start.status === 201 && !!start.body.threadId && start.body.messages.length === 1);
  const tid = start.body.threadId;
  const cont = await guest("/api/support", { method: "POST", body: JSON.stringify({ threadId: tid, body: "Just checking, thanks!" }) });
  check("visitor sends a second message", cont.body.messages.length === 2);
  const need = await guest("/api/support", { method: "POST", body: JSON.stringify({ body: "no thread no info" }) });
  check("new thread requires name+email", need.status === 400);

  const admin = client();
  await admin("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@demo.com", password: "password123" }) });
  const inbox = await admin("/api/admin/support");
  check("admin sees the support thread", inbox.body.threads.some((t) => t.id === tid));
  const reply = await admin(`/api/admin/support/${tid}`, { method: "POST", body: JSON.stringify({ body: "Yes, we ship to all 50 states!" }) });
  check("admin replies", reply.status === 200 && reply.body.messages.some((m) => m.fromRole === "ADMIN"));
  const visitorView = await guest(`/api/support?threadId=${tid}`);
  check("visitor sees the admin reply", visitorView.body.messages.some((m) => m.fromRole === "ADMIN" && /50 states/.test(m.body)));
  const blocked = await client()("/api/admin/support");
  check("non-admin blocked from help desk", blocked.status === 403 || blocked.status === 401);

  // ---- Full seller edit ----
  console.log("\n2. Full seller edit");
  const sellers = (await admin("/api/admin/sellers")).body.sellers;
  const sid = sellers[0].id;
  const sGet = await admin(`/api/admin/sellers/${sid}`);
  check("admin reads full seller", !!sGet.body.store?.name);
  const sEdit = await admin(`/api/admin/sellers/${sid}`, { method: "PATCH", body: JSON.stringify({ bio: "Edited tagline", employees: 99 }) });
  check("admin edits seller info", sEdit.body.store?.bio === "Edited tagline" && sEdit.body.store?.employees === 99);

  // ---- Full product edit + feature placement ----
  console.log("\n3. Full product edit + featuring");
  const products = (await admin("/api/admin/products")).body.products;
  const pid = products[0].id;
  const pGet = await admin(`/api/admin/products/${pid}`);
  check("admin reads full product", !!pGet.body.product?.name);
  const pEdit = await admin(`/api/admin/products/${pid}`, { method: "PATCH", body: JSON.stringify({ priceCents: 12345, featuredCategory: true, featuredNewsletter: true }) });
  check("admin edits product price", pEdit.body.product?.priceCents === 12345);
  check("admin sets feature placements", pEdit.body.product?.featuredCategory === true && pEdit.body.product?.featuredNewsletter === true);

  // ---- Dashboard charts data ----
  console.log("\n4. Dashboard charts");
  const stats = (await admin("/api/admin/stats")).body;
  check("14-day trend present", Array.isArray(stats.days) && stats.days.length === 14);
  check("sales-by-category present", Array.isArray(stats.salesByCategory));
  check("top-sellers present", Array.isArray(stats.topSellers));

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️ SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error("crashed:", e); process.exit(1); });
