// Tests store credit (returns→credit, redeemable at checkout), gift cards, FBT, stock alerts.
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
const ship = { fullName: "C2 Tester", line1: "1 Test St", city: "Austin", state: "TX", zip: "78701" };

async function main() {
  console.log(`\nTesting store credit / gift cards / FBT / stock alerts at ${BASE}\n`);
  const seller = client();
  await seller("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "seller5@demo.com", password: "password123" }) });
  const myProducts = (await seller("/api/seller/products")).body.products;
  const p = myProducts.find((x) => !(x.sizes && x.sizes.trim())) || myProducts[0];
  const buyer = client();
  await buyer("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "buyer@demo.com", password: "password123" }) });
  const order = (pid, useCredit = false) => buyer("/api/orders", { method: "POST", body: JSON.stringify({ items: [{ productId: pid, quantity: 1 }], shipping: ship, useCredit }) });

  console.log("1. Frequently bought together");
  const bundle = await client()(`/api/products/${p.id}/bundle`);
  check("bundle endpoint returns companions", Array.isArray(bundle.body.products) && bundle.body.products.length >= 1);

  console.log("2. Back-in-stock alerts");
  await seller(`/api/seller/products/${p.id}`, { method: "PATCH", body: JSON.stringify({ stockQty: 0 }) });
  const alert = await client()(`/api/products/${p.id}/stock-alert`, { method: "POST", body: JSON.stringify({ email: "waitlist@demo.com" }) });
  check("can sign up for back-in-stock alert", alert.status === 201);
  const restock = await seller(`/api/seller/products/${p.id}`, { method: "PATCH", body: JSON.stringify({ stockQty: 25 }) });
  check("seller can restock (triggers notify)", restock.status === 200);

  console.log("3. Gift cards");
  const buy = await buyer("/api/gift-cards/purchase", { method: "POST", body: JSON.stringify({ amountCents: 2500, recipientEmail: "buyer@demo.com" }) });
  check("buy gift card returns a code", buy.status === 201 && /^HFGC-/.test(buy.body.code));
  const redeem = await buyer("/api/gift-cards/redeem", { method: "POST", body: JSON.stringify({ code: buy.body.code }) });
  check("redeem adds store credit", redeem.status === 200 && redeem.body.creditedCents === 2500);
  const redeemAgain = await buyer("/api/gift-cards/redeem", { method: "POST", body: JSON.stringify({ code: buy.body.code }) });
  check("can't redeem twice (409)", redeemAgain.status === 409);
  const bogus = await buyer("/api/gift-cards/redeem", { method: "POST", body: JSON.stringify({ code: "HFGC-0000-0000-0000" }) });
  check("bogus code rejected (404)", bogus.status === 404);

  console.log("4. Returns pay out as store credit");
  const o = await order(p.id);
  const itemId = o.body.order.items[0].id;
  await seller(`/api/seller/orders/${itemId}/label`, { method: "POST", body: JSON.stringify({ service: "usps_ground" }) });
  const ret = await buyer(`/api/orders/${o.body.order.id}/return`, { method: "POST", body: JSON.stringify({ orderItemId: itemId, reason: "Store credit please" }) });
  const admin = client();
  await admin("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@demo.com", password: "password123" }) });
  const refund = await admin(`/api/admin/returns/${ret.body.returnRequest.id}`, { method: "PATCH", body: JSON.stringify({ action: "refund", restock: true }) });
  check("return refund credits the buyer", refund.status === 200 && refund.body.creditedCents === p.priceCents);
  const bal1 = (await buyer("/api/account/credit")).body.storeCreditCents;
  check("buyer credit = $25 gift card + refund", bal1 === 2500 + p.priceCents);

  console.log("5. Store credit applied at checkout");
  const credited = await order(p.id, true);
  const ord = credited.body.order;
  check("order applies store credit", ord.creditCents > 0);
  const bal2 = (await buyer("/api/account/credit")).body.storeCreditCents;
  check("balance reduced by the credit applied", bal2 === bal1 - ord.creditCents);

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
