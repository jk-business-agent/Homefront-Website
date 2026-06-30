// End-to-end test for platform-managed shipping labels (simulation mode).
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
  console.log(`\nTesting shipping labels at ${BASE}\n`);
  const buyer = client();
  await buyer("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "buyer@demo.com", password: "password123" }) });
  const products = (await buyer("/api/products")).body.products;
  const bottle = products.find((p) => /bottle/i.test(p.name));

  const order = await buyer("/api/orders", { method: "POST", body: JSON.stringify({
    items: [{ productId: bottle.id, quantity: 1 }],
    shipping: { fullName: "Demo Buyer", line1: "742 Liberty Ave", city: "Austin", state: "TX", zip: "78701" },
    shippingService: "usps_priority",
  }) });
  check("buyer placed an order", order.status === 201);
  const orderId = order.body.order.id;

  // Seller buys a label
  const seller = client();
  await seller("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "seller5@demo.com", password: "password123" }) });
  const so = await seller("/api/seller/orders");
  const item = so.body.ordersToFulfill.find((o) => o.orderId === orderId)?.items?.[0];
  check("seller sees the pending item", !!item && item.fulfillmentStatus === "PENDING");

  const label = await seller(`/api/seller/orders/${item.itemId}/label`, { method: "POST", body: JSON.stringify({ service: "usps_priority" }) });
  check("label created", label.status === 200 && !!label.body.labelUrl);
  check("tracking number auto-captured", typeof label.body.trackingNumber === "string" && label.body.trackingNumber.length > 0);
  check("runs in simulation mode (no key)", label.body.simulated === true);

  // Item is now shipped with tracking + label
  const so2 = await seller("/api/seller/orders");
  const item2 = so2.body.ordersToFulfill.find((o) => o.orderId === orderId)?.items?.[0];
  check("item marked shipped with label", item2.fulfillmentStatus === "SHIPPED" && !!item2.labelUrl && !!item2.trackingNumber);

  // Can't double-buy a label
  const dup = await seller(`/api/seller/orders/${item.itemId}/label`, { method: "POST", body: JSON.stringify({}) });
  check("cannot create a second label", dup.status === 400);

  // The printable label page loads for the seller
  const labelPage = await seller(label.body.labelUrl);
  check("printable label page loads", labelPage.status === 200 && typeof labelPage.body === "string" && labelPage.body.includes(label.body.trackingNumber));

  // Webhook marks it delivered
  const hook = await client()("/api/webhooks/easypost", { method: "POST", body: JSON.stringify({ result: { object: "Tracker", tracking_code: label.body.trackingNumber, status: "delivered" } }) });
  check("tracking webhook accepted", hook.status === 200);
  const myOrders = await buyer("/api/orders");
  const myItem = myOrders.body.orders.find((o) => o.id === orderId)?.items?.[0];
  check("buyer sees tracking number", myItem?.trackingNumber === label.body.trackingNumber);
  check("delivery auto-updated to DELIVERED", myItem?.fulfillmentStatus === "DELIVERED");

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️ SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error("crashed:", e); process.exit(1); });
