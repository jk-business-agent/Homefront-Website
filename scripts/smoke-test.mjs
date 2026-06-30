// End-to-end backend smoke test. Run the dev server first, then: node scripts/smoke-test.mjs
// Exercises: browse -> buyer login -> place order -> seller sees it -> seller ships it.
const BASE = process.env.BASE || "http://localhost:3000";

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
}

// A tiny cookie jar so login sessions persist across requests.
function makeClient() {
  let cookie = "";
  return async (path, opts = {}) => {
    const res = await fetch(BASE + path, {
      ...opts,
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...(opts.headers || {}) },
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  };
}

async function main() {
  console.log(`\nTesting backend at ${BASE}\n`);

  // 1. Browse catalog (no login needed)
  console.log("1. Public catalog");
  const guest = makeClient();
  const list = await guest("/api/products");
  check("GET /api/products returns products", Array.isArray(list.body.products) && list.body.products.length > 0);
  const firstProduct = list.body.products?.[0];
  check("products include store info", !!firstProduct?.store?.name);
  const cats = await guest("/api/categories");
  check("GET /api/categories returns categories", Array.isArray(cats.body.categories) && cats.body.categories.length > 0);
  const search = await guest("/api/products?search=boots");
  check("search for 'boots' finds the work boots", search.body.products?.some((p) => /boots/i.test(p.name)));

  // 2. Buyer logs in and places an order
  console.log("\n2. Buyer places an order");
  const buyer = makeClient();
  const login = await buyer("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "buyer@demo.com", password: "password123" }) });
  check("buyer can log in", login.status === 200 && login.body.user?.role === "BUYER");
  const me = await buyer("/api/auth/me");
  check("session persists (auth/me)", me.body.user?.email === "buyer@demo.com");

  const order = await buyer("/api/orders", {
    method: "POST",
    body: JSON.stringify({
      items: [{ productId: firstProduct.id, quantity: 2 }],
      shipping: { fullName: "Demo Buyer", line1: "123 Main St", city: "Columbus", state: "OH", zip: "43004" },
    }),
  });
  check("order is created", order.status === 201 && !!order.body.order?.id);
  const expectedSub = firstProduct.priceCents * 2;
  check("order total includes subtotal + shipping + tax", order.body.order?.totalCents > expectedSub && order.body.order?.shippingCents > 0);
  const myOrders = await buyer("/api/orders");
  check("buyer can see their order history", myOrders.body.orders?.length > 0);

  // 3. Unauthenticated order is rejected
  console.log("\n3. Security checks");
  const guestOrder = await guest("/api/orders", {
    method: "POST",
    body: JSON.stringify({ items: [{ productId: firstProduct.id, quantity: 1 }], shipping: { fullName: "x", line1: "x", city: "x", state: "x", zip: "x" } }),
  });
  check("anonymous user cannot place an order (401)", guestOrder.status === 401);
  const guestSeller = await guest("/api/seller/orders");
  check("non-seller cannot view seller orders (401/403)", guestSeller.status === 401 || guestSeller.status === 403);

  // 4. The right seller sees the order and ships it
  console.log("\n4. Seller fulfillment");
  const sellerStoreId = firstProduct.storeId;
  // Find which demo seller owns the product we ordered by trying seller logins.
  let sellerClient = null, sellerOrders = null;
  for (let i = 1; i <= 11; i++) {
    const c = makeClient();
    await c("/api/auth/login", { method: "POST", body: JSON.stringify({ email: `seller${i}@demo.com`, password: "password123" }) });
    const so = await c("/api/seller/orders");
    if (so.body.ordersToFulfill?.some((o) => o.orderId === order.body.order.id)) {
      sellerClient = c; sellerOrders = so.body; break;
    }
  }
  check("the correct seller sees the new order to fulfill", !!sellerOrders);
  const toShip = sellerOrders?.ordersToFulfill?.find((o) => o.orderId === order.body.order.id);
  check("seller sees the shipping address", !!toShip?.shipTo?.city);
  check("seller sees quantity ordered", toShip?.items?.[0]?.quantity === 2);

  const itemId = toShip?.items?.[0]?.itemId;
  const ship = await sellerClient("/api/seller/orders/" + itemId + "/ship", { method: "POST" });
  check("seller can mark the item shipped", ship.body.fulfillmentStatus === "SHIPPED");
  check("order flips to fully shipped", ship.body.orderFullyShipped === true);

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️ SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error("Test crashed:", e); process.exit(1); });
