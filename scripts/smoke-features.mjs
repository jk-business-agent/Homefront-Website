// End-to-end test for the new features: likes, reviews, account, seller tools, tracking.
const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log(`  ✅ ${name}`); } else { fail++; console.log(`  ❌ ${name}`); } }
function client() {
  let cookie = "";
  return async (p, o = {}) => {
    const r = await fetch(BASE + p, { ...o, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...(o.headers || {}) } });
    const sc = r.headers.get("set-cookie"); if (sc) cookie = sc.split(";")[0];
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };
}

async function main() {
  console.log(`\nTesting new features at ${BASE}\n`);
  const guest = client();
  const products = (await guest("/api/products")).body.products;
  const target = products[products.length - 1]; // a product the demo buyer hasn't liked

  // 1. Likes
  console.log("1. Likes / favorites");
  const buyer = client();
  await buyer("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "buyer@demo.com", password: "password123" }) });
  const baseLikes = target.likeCount;
  const liked = await buyer(`/api/products/${target.id}/like`, { method: "POST" });
  check("like toggles on", liked.body.liked === true && liked.body.likeCount === baseLikes + 1);
  const favs = await buyer("/api/account/favorites?ids=1");
  check("favorite shows in list", favs.body.productIds.includes(target.id));
  const unliked = await buyer(`/api/products/${target.id}/like`, { method: "POST" });
  check("like toggles off", unliked.body.liked === false && unliked.body.likeCount === baseLikes);
  const guestLike = await guest(`/api/products/${target.id}/like`, { method: "POST" });
  check("guest can't like (401)", guestLike.status === 401);

  // 2. Reviews
  console.log("\n2. Reviews");
  const rev = await buyer(`/api/products/${target.id}/reviews`, { method: "POST", body: JSON.stringify({ rating: 5, title: "Test review", body: "Great American product!" }) });
  check("review created", rev.status === 201);
  const revList = await buyer(`/api/products/${target.id}/reviews`);
  check("review appears in list", revList.body.reviews.some((r) => r.title === "Test review"));
  const badRev = await guest(`/api/products/${target.id}/reviews`, { method: "POST", body: JSON.stringify({ rating: 5, body: "x" }) });
  check("guest can't review (401)", badRev.status === 401);

  // 3. Account management
  console.log("\n3. Account management");
  const prof = await buyer("/api/account/profile", { method: "PATCH", body: JSON.stringify({ name: "Demo Buyer Updated" }) });
  check("profile name updates", prof.body.name === "Demo Buyer Updated");
  await buyer("/api/account/profile", { method: "PATCH", body: JSON.stringify({ name: "Demo Buyer" }) }); // revert
  const addr = await buyer("/api/account/addresses", { method: "POST", body: JSON.stringify({ fullName: "Demo Buyer", line1: "1 Test St", city: "Columbus", state: "OH", zip: "43004" }) });
  check("address added", addr.status === 201);
  const addrList = await buyer("/api/account/addresses");
  check("address listed", addrList.body.addresses.length > 0);
  await buyer(`/api/account/addresses?id=${addr.body.address.id}`, { method: "DELETE" });
  const wrongPw = await buyer("/api/account/password", { method: "POST", body: JSON.stringify({ currentPassword: "wrong", newPassword: "newpassword123" }) });
  check("wrong current password rejected", wrongPw.status === 400);

  // 4. Seller tools (seller5 = Summit Steel Goods, owns the top water bottle)
  console.log("\n4. Seller tools");
  const seller = client();
  await seller("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "seller5@demo.com", password: "password123" }) });
  const sales = await seller("/api/seller/sales");
  check("sales endpoint returns metrics", typeof sales.body.revenueCents === "number" && Array.isArray(sales.body.topProducts));
  const sreviews = await seller("/api/seller/reviews");
  check("seller sees reviews on their products", typeof sreviews.body.count === "number");
  const store = await seller("/api/seller/store");
  check("seller store loads", !!store.body.store?.name);
  const patchStore = await seller("/api/seller/store", { method: "PATCH", body: JSON.stringify({ employees: 42 }) });
  check("seller can update business info", patchStore.body.store?.employees === 42);
  const newProd = await seller("/api/seller/products", { method: "POST", body: JSON.stringify({ name: "Test Anvil " + Math.floor(performance.now()), description: "A test", priceCents: 1999, category: "Tools", madeInState: "Ohio", weightOz: 200, shippingPriceCents: 0, sizes: "", safetyInfo: "Heavy" }) });
  check("seller adds product with new fields", newProd.status === 201 && newProd.body.product?.weightOz === 200);

  // 5. Order + tracking flow
  console.log("\n5. Order + tracking");
  const bottle = products.find((p) => /bottle/i.test(p.name));
  const order = await buyer("/api/orders", { method: "POST", body: JSON.stringify({ items: [{ productId: bottle.id, quantity: 1 }], shipping: { fullName: "Demo Buyer", line1: "1 Test St", city: "Columbus", state: "OH", zip: "43004" } }) });
  check("order placed", order.status === 201);
  const so = await seller("/api/seller/orders");
  const toShip = so.body.ordersToFulfill.find((o) => o.orderId === order.body.order.id);
  check("seller sees the new order", !!toShip);
  const itemId = toShip?.items?.[0]?.itemId;
  const ship = await seller(`/api/seller/orders/${itemId}/ship`, { method: "POST", body: JSON.stringify({ carrier: "UPS", trackingNumber: "1Z999AA10123456784" }) });
  check("item shipped with tracking", ship.body.fulfillmentStatus === "SHIPPED");
  const myOrders = await buyer("/api/orders");
  const myItem = myOrders.body.orders.find((o) => o.id === order.body.order.id)?.items?.[0];
  check("buyer sees tracking number", myItem?.trackingNumber === "1Z999AA10123456784" && myItem?.trackingCarrier === "UPS");

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️ SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error("crashed:", e); process.exit(1); });
