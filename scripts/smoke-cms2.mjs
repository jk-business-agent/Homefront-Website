// Tests for beehiiv (simulation mode) + the product-page template.
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
  console.log(`\nTesting beehiiv + product template at ${BASE}\n`);

  console.log("1. Newsletter signup still works in sim mode (no beehiiv key)");
  const sub = await client()("/api/newsletter/subscribe", { method: "POST", body: JSON.stringify({ email: `cms2_${Math.floor(performance.now())}@demo.com`, source: "page" }) });
  check("subscribe succeeds (201/200)", sub.status === 201 || sub.status === 200);
  const news = await client()("/newsletter");
  check("newsletter page renders (200)", news.status === 200);
  check("shows local stories in sim mode", typeof news.body === "string" && news.body.includes("Read story") && !news.body.includes("Read issue"));

  console.log("2. Product-page template is a built-in CMS page");
  const admin = client();
  await admin("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@demo.com", password: "password123" }) });
  const list = await admin("/api/admin/pages");
  const tmpl = (list.body.pages || []).find((p) => p.key === "product-template");
  check("product-template page exists", !!tmpl);
  check("template is built-in (system)", tmpl?.system === true);
  const detail = await admin(`/api/admin/pages/${tmpl.id}`);
  const types = detail.body.page.sections.map((s) => s.type);
  check("template has related-products + newsletter widgets", types.includes("relatedProducts") && types.includes("newsletterSignup"));

  console.log("3. Template route is not publicly visitable");
  const direct = await client()("/p/product-template");
  check("/p/product-template returns 404", direct.status === 404);

  console.log("4. Product pages render the template widgets");
  const prods = await client()("/api/products");
  let slug = prods.body?.products?.[0]?.slug;
  if (!slug) {
    const home = await client()("/");
    slug = (typeof home.body === "string" && /\/products\/([a-z0-9-]+)/.exec(home.body)?.[1]) || null;
  }
  check("found a product slug", !!slug);
  if (slug) {
    const pd = await client()(`/products/${slug}`);
    check("product page renders (200)", pd.status === 200);
    check("shows related-products widget", typeof pd.body === "string" && pd.body.includes("You might also like"));
    check("shows newsletter widget from template", typeof pd.body === "string" && pd.body.includes("more American-made picks"));
  }

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
