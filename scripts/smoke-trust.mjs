// Tests: verified-purchase reviews, order cancellation + restock, returns + refund.
const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
const check = (n, c) => { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n}`); } };
function client() {
  let ck = "";
  return async (p, o = {}) => {
    const r = await fetch(BASE + p, { ...o, headers: { "Content-Type": "application/json", ...(ck ? { Cookie: ck } : {}), ...(o.headers || {}) } });
    const sc = r.headers.get("set-cookie"); if (sc) ck = sc.split(";")[0];
    const ct = r.headers.get("content-type") || "";
    return { status: r.status, body: ct.includes("json") ? await r.json().catch(() => ({})) : await r.text() };
  };
}
const uniq = () => Math.floor(performance.now()) + "" + (performance.now() % 1000 | 0);
const ship = { fullName: "Trust Tester", line1: "1 Test St", city: "Austin", state: "TX", zip: "78701" };

async function main() {
  console.log(`\nTesting returns + verified reviews at ${BASE}\n`);
  const seller = client();
  await seller("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "seller5@demo.com", password: "password123" }) });
  const myProducts = (await seller("/api/seller/products")).body.products;
  const p = myProducts.find((x) => !(x.sizes && x.sizes.trim())) || myProducts[0]; // non-sized to keep stock simple
  const all = (await client()("/api/products")).body.products;
  const q = all.find((x) => x.id !== p.id);

  const buyer = client();
  await buyer("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "buyer@demo.com", password: "password123" }) });
  const order = (pid) => buyer("/api/orders", { method: "POST", body: JSON.stringify({ items: [{ productId: pid, quantity: 1 }], shipping: ship }) });

  console.log("1. Verified-purchase reviews");
  await order(p.id); // buyer now owns p
  const vbody = "Bought it — great! " + uniq();
  await buyer(`/api/products/${p.id}/reviews`, { method: "POST", body: JSON.stringify({ rating: 5, body: vbody }) });
  const pReviews = (await client()(`/api/products/${p.id}/reviews`)).body.reviews || [];
  check("review by a buyer is VERIFIED", pReviews.find((r) => r.body === vbody)?.verified === true);

  const ubody = "Didn't buy this one " + uniq();
  await buyer(`/api/products/${q.id}/reviews`, { method: "POST", body: JSON.stringify({ rating: 4, body: ubody }) });
  const qReviews = (await client()(`/api/products/${q.id}/reviews`)).body.reviews || [];
  check("review without purchase is NOT verified", qReviews.find((r) => r.body === ubody)?.verified === false);

  // The breakdown bars render client-side from this data (verified in the live DOM separately).
  check("rating data available for breakdown bars", pReviews.length > 0 && pReviews.every((r) => typeof r.rating === "number"));

  console.log("2. Order cancellation + restock");
  const stockBefore = (await seller("/api/seller/products")).body.products.find((x) => x.id === p.id).stockQty;
  const oc = await order(p.id);
  const ocId = oc.body.order.id;
  const cancel = await buyer(`/api/orders/${ocId}/cancel`, { method: "POST" });
  check("buyer can cancel an unshipped order", cancel.status === 200 && cancel.body.cancelled);
  const stockAfter = (await seller("/api/seller/products")).body.products.find((x) => x.id === p.id).stockQty;
  check("cancelled order restocks inventory", stockAfter === stockBefore);
  const cancelAgain = await buyer(`/api/orders/${ocId}/cancel`, { method: "POST" });
  check("can't cancel twice", cancelAgain.status === 400);

  console.log("3. Returns + refund");
  const orderR = await order(p.id);
  const itemId = orderR.body.order.items[0].id;
  // Can't return before it ships.
  const earlyReturn = await buyer(`/api/orders/${orderR.body.order.id}/return`, { method: "POST", body: JSON.stringify({ orderItemId: itemId, reason: "too soon" }) });
  check("can't return an unshipped item (400)", earlyReturn.status === 400);
  // Seller ships it.
  const label = await seller(`/api/seller/orders/${itemId}/label`, { method: "POST", body: JSON.stringify({ service: "usps_ground" }) });
  check("seller ships the item", label.status === 200);
  // Buyer requests a return.
  const ret = await buyer(`/api/orders/${orderR.body.order.id}/return`, { method: "POST", body: JSON.stringify({ orderItemId: itemId, reason: "Changed my mind" }) });
  check("buyer requests a return (201)", ret.status === 201);
  const dup = await buyer(`/api/orders/${orderR.body.order.id}/return`, { method: "POST", body: JSON.stringify({ orderItemId: itemId, reason: "again" }) });
  check("duplicate return blocked (409)", dup.status === 409);

  // Admin refunds + restocks.
  const admin = client();
  await admin("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@demo.com", password: "password123" }) });
  const list = (await admin("/api/admin/returns?status=REQUESTED")).body.returns || [];
  const mine = list.find((r) => r.id === ret.body.returnRequest.id);
  check("return shows in admin queue", !!mine);
  const stockPreRefund = (await seller("/api/seller/products")).body.products.find((x) => x.id === p.id).stockQty;
  const refund = await admin(`/api/admin/returns/${mine.id}`, { method: "PATCH", body: JSON.stringify({ action: "refund", restock: true }) });
  check("admin refunds (200)", refund.status === 200 && refund.body.refunded);
  const stockPostRefund = (await seller("/api/seller/products")).body.products.find((x) => x.id === p.id).stockQty;
  check("refund restocks the item", stockPostRefund === stockPreRefund + 1);
  const after = (await admin("/api/admin/returns")).body.returns.find((r) => r.id === mine.id);
  check("return now REFUNDED", after.status === "REFUNDED");
  const reResolve = await admin(`/api/admin/returns/${mine.id}`, { method: "PATCH", body: JSON.stringify({ action: "reject" }) });
  check("can't re-resolve a closed return (400)", reResolve.status === 400);

  console.log("4. Permissions");
  const anonReturns = await client()("/api/admin/returns");
  check("non-admin can't see returns queue (403)", anonReturns.status === 403);

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
