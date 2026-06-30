// Verifies the image pipeline: upload → attach to a product → page serves
// Cloudinary f_auto,q_auto + responsive srcset.
const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
const check = (n, c) => { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n}`); } };
function client() {
  let ck = "";
  return async (p, o = {}) => {
    const r = await fetch(BASE + p, { ...o, headers: { ...(o.headers || {}), ...(ck ? { Cookie: ck } : {}) } });
    const sc = r.headers.get("set-cookie"); if (sc) ck = sc.split(";")[0];
    const ct = r.headers.get("content-type") || "";
    return { status: r.status, body: ct.includes("json") ? await r.json().catch(() => ({})) : await r.text(), ck };
  };
}
const uniq = () => Math.floor(performance.now()) + "" + (performance.now() % 1000 | 0);

async function main() {
  console.log(`\nTesting image pipeline at ${BASE}\n`);
  const seller = client();
  await seller("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "seller5@demo.com", password: "password123" }) });

  // 1. Upload a real image to Cloudinary through the app.
  const imgBytes = Buffer.from(await (await fetch("https://res.cloudinary.com/demo/image/upload/sample.jpg")).arrayBuffer());
  const fd = new FormData();
  fd.append("file", new Blob([imgBytes], { type: "image/jpeg" }), "prod.jpg");
  const up = await seller("/api/upload", { method: "POST", body: fd });
  const url = up.body.url;
  check("uploaded to Cloudinary", typeof url === "string" && url.includes("res.cloudinary.com"));

  // 2. Create a product with that image.
  const name = "Image Pipeline Test " + uniq();
  const created = await seller("/api/seller/products", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description: "Testing responsive images.", priceCents: 4200, category: "Tools", madeInState: "Texas", imageUrls: [url] }),
  });
  check("product created with image", created.status === 201);
  const slug = created.body.product?.slug;

  // 3. Product page serves an optimized, responsive main image.
  const pd = await client()(`/products/${slug}`);
  check("product page uses f_auto,q_auto", pd.body.includes("f_auto,q_auto"));
  check("product page main image is responsive (srcset)", pd.body.match(/srcset=/i));
  check("product page serves widths for devices", /w_480|w_768|w_1024/.test(pd.body));

  // 4. Product card (on the maker's store page) shows the photo, square-cropped + responsive.
  const storeRes = await client()("/api/seller/store");
  // store slug via public store page: find it from vendors or just use the product page's store link
  const sslugMatch = /\/store\/([a-z0-9-]+)/.exec(pd.body);
  if (sslugMatch) {
    const store = await client()(`/store/${sslugMatch[1]}`);
    check("product card uses square crop (c_fill)", store.body.includes("c_fill"));
    check("product card image is responsive (srcset)", store.body.match(/srcset=/i));
  } else {
    check("found store link on product page", false);
  }

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
