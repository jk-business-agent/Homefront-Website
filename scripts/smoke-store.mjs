// Tests for public maker store pages (/store/[slug]).
const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n}`); } }
const get = async (p) => { const r = await fetch(BASE + p, { cache: "no-store" }); return { status: r.status, body: await r.text() }; };

async function main() {
  console.log(`\nTesting public store pages at ${BASE}\n`);

  // Discover a store slug from the Vendors page (its cards link to /store/<slug>).
  const vendors = await get("/vendors");
  const slug = /\/store\/([a-z0-9-]+)/.exec(vendors.body)?.[1];
  check("found a store slug from Vendors page", !!slug);
  check("Vendors uses 'Visit' links to store pages", vendors.body.includes("/store/"));

  if (slug) {
    const store = await get(`/store/${slug}`);
    check("store page renders (200)", store.status === 200);
    check("shows 'Verified American Maker' banner", store.body.includes("Verified American Maker"));
    check("shows 'Shop' products heading", store.body.includes("Shop "));
    check("renders product cards or empty state", store.body.includes('class="card"') || store.body.includes("No products listed"));
  }

  const missing = await get("/store/no-such-maker-xyz");
  check("unknown store returns 404", missing.status === 404);

  // Product page links to the store page.
  const prods = await fetch(BASE + "/api/products").then((r) => r.json()).catch(() => ({}));
  const pslug = prods?.products?.[0]?.slug;
  if (pslug) {
    const pd = await get(`/products/${pslug}`);
    check("product page links to a /store/ page", pd.body.includes("/store/"));
  }

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
