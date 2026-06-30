// Tests for seller-run coupons + product Q&A + wishlist notes + recently-viewed.
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
const uniq = () => Math.floor(performance.now()) + "" + (performance.now() % 1000 | 0);

async function main() {
  console.log(`\nTesting seller coupons + buyer upgrades at ${BASE}\n`);
  const seller = client();
  await seller("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "seller5@demo.com", password: "password123" }) });
  const myProducts = (await seller("/api/seller/products")).body.products || [];
  const myProd = myProducts[0];
  const all = (await client()("/api/products")).body.products || [];
  const foreign = all.find((p) => !myProducts.some((m) => m.id === p.id));

  console.log("1. Seller-run coupons (store-scoped)");
  const code = "SELL" + uniq();
  const created = await seller("/api/seller/coupons", { method: "POST", body: JSON.stringify({ code, type: "PERCENT", value: 20 }) });
  check("seller creates a coupon (201)", created.status === 201);
  const listed = await seller("/api/seller/coupons");
  check("coupon shows in seller's list", (listed.body.coupons || []).some((c) => c.code === code));

  // Applies to this seller's item:
  const v1 = await client()("/api/coupons/validate", { method: "POST", body: JSON.stringify({ code, items: [{ productId: myProd.id, quantity: 1 }] }) });
  check("seller coupon valid on own product", v1.body.valid === true);
  check("discount = 20% of that product's line", v1.body.discountCents === Math.round(myProd.priceCents * 0.2));

  // Does NOT apply when only other makers' items are in the cart:
  if (foreign) {
    const v2 = await client()("/api/coupons/validate", { method: "POST", body: JSON.stringify({ code, items: [{ productId: foreign.id, quantity: 1 }] }) });
    check("seller coupon rejected when its store's items aren't in cart", v2.body.valid === false);
  }

  // Another seller cannot manage this coupon.
  const other = client();
  await other("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "seller6@demo.com", password: "password123" }) });
  const cid = created.body.coupon.id;
  const steal = await other(`/api/seller/coupons/${cid}`, { method: "DELETE" });
  check("another seller can't delete this coupon (404)", steal.status === 404);

  // Toggle off → invalid.
  await seller(`/api/seller/coupons/${cid}`, { method: "PATCH", body: JSON.stringify({ active: false }) });
  const v3 = await client()("/api/coupons/validate", { method: "POST", body: JSON.stringify({ code, items: [{ productId: myProd.id, quantity: 1 }] }) });
  check("disabled coupon is invalid", v3.body.valid === false);

  console.log("2. Admin coupon still whole-cart");
  const adminCoupon = await client()("/api/coupons/validate", { method: "POST", body: JSON.stringify({ code: "USA10", items: [{ productId: myProd.id, quantity: 1 }, ...(foreign ? [{ productId: foreign.id, quantity: 1 }] : [])] }) });
  const expected = Math.round((myProd.priceCents + (foreign ? foreign.priceCents : 0)) * 0.1);
  check("platform coupon discounts whole subtotal", adminCoupon.body.valid && adminCoupon.body.discountCents === expected);

  console.log("3. Product Q&A");
  const buyer = client();
  await buyer("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "buyer@demo.com", password: "password123" }) });
  const qBody = "Test question " + uniq();
  const asked = await buyer(`/api/products/${myProd.id}/questions`, { method: "POST", body: JSON.stringify({ body: qBody }) });
  check("buyer asks a question (201)", asked.status === 201);
  const qid = asked.body.question.id;
  const qlist = await client()(`/api/products/${myProd.id}/questions`);
  check("question appears (unanswered)", (qlist.body.questions || []).some((q) => q.id === qid && !q.answer));

  const otherAnswer = await other(`/api/questions/${qid}`, { method: "PATCH", body: JSON.stringify({ answer: "nope" }) });
  check("non-owner seller can't answer (403)", otherAnswer.status === 403);
  const ans = await seller(`/api/questions/${qid}`, { method: "PATCH", body: JSON.stringify({ answer: "Yes, absolutely!" }) });
  check("owning seller can answer (200)", ans.status === 200);
  const qlist2 = await client()(`/api/products/${myProd.id}/questions`);
  check("answer now visible", (qlist2.body.questions || []).some((q) => q.id === qid && q.answer === "Yes, absolutely!"));

  console.log("4. Wishlist notes");
  await buyer(`/api/products/${myProd.id}/like`, { method: "POST" }); // ensure liked
  const note = "Gift idea " + uniq();
  const setNote = await buyer("/api/account/favorites", { method: "PATCH", body: JSON.stringify({ productId: myProd.id, note }) });
  check("save note on a liked item", setNote.status === 200);
  const favs = await buyer("/api/account/favorites");
  check("note persists in saved items", (favs.body.saved || []).some((s) => s.product.id === myProd.id && s.note === note));

  console.log("5. Recently viewed");
  await buyer(`/api/products/${myProd.id}/view`, { method: "POST" });
  const rv = await buyer("/api/account/recently-viewed");
  check("recently-viewed lists the viewed product", (rv.body.products || []).some((p) => p.id === myProd.id));
  const anon = await client()("/api/account/recently-viewed");
  check("signed-out gets empty recently-viewed", Array.isArray(anon.body.products) && anon.body.products.length === 0);

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
