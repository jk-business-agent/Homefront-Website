// End-to-end test for per-size inventory (variants).
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n}`); } }
function client() {
  let ck = "";
  return async (p, o = {}) => {
    const r = await fetch(BASE + p, { ...o, headers: { "Content-Type": "application/json", ...(ck ? { Cookie: ck } : {}), ...(o.headers || {}) } });
    const sc = r.headers.get("set-cookie"); if (sc) ck = sc.split(";")[0];
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };
}

async function main() {
  console.log(`\nTesting per-size inventory at ${BASE}\n`);
  // Pick a sized tee + its variants from the DB.
  const tee = await prisma.product.findFirst({ where: { sizes: { not: null }, active: true, name: { contains: "Tee" } }, include: { variants: true } });
  const vS = tee.variants.find((v) => v.size === "S");
  const vXXL = tee.variants.find((v) => v.size === "XXL");
  check("sized product has per-size variants", tee.variants.length >= 5 && !!vS);

  const buyer = client();
  await buyer("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "buyer@demo.com", password: "password123" }) });
  const ship = { fullName: "D", line1: "1", city: "Denver", state: "CO", zip: "80014" };

  // 1. Order without a size is rejected
  const noSize = await buyer("/api/orders", { method: "POST", body: JSON.stringify({ items: [{ productId: tee.id, quantity: 1 }], shipping: ship, shippingService: "usps_ground" }) });
  check("ordering a sized item without a size is rejected", noSize.status === 400 && /size/i.test(noSize.body.error));

  // 2. Order more than the size has is rejected
  const tooMany = await buyer("/api/orders", { method: "POST", body: JSON.stringify({ items: [{ productId: tee.id, quantity: vXXL.stockQty + 5, size: "XXL" }], shipping: ship, shippingService: "usps_ground" }) });
  check("ordering more than a size's stock is rejected", tooMany.status === 400 && /left/i.test(tooMany.body.error));

  // 3. Valid sized order decrements that size only
  const beforeS = vS.stockQty;
  const beforeXXL = vXXL.stockQty;
  const ok = await buyer("/api/orders", { method: "POST", body: JSON.stringify({ items: [{ productId: tee.id, quantity: 2, size: "S" }], shipping: ship, shippingService: "usps_ground" }) });
  check("valid sized order succeeds", ok.status === 201);
  const afterS = await prisma.productVariant.findUnique({ where: { id: vS.id } });
  const afterXXL = await prisma.productVariant.findUnique({ where: { id: vXXL.id } });
  check("size S stock decremented by 2", afterS.stockQty === beforeS - 2);
  check("other sizes (XXL) unchanged", afterXXL.stockQty === beforeXXL);

  // 4. Seller restocks per size
  const seller = client();
  // find which seller owns the tee
  const store = await prisma.store.findUnique({ where: { id: tee.storeId }, include: { owner: true } });
  await seller("/api/auth/login", { method: "POST", body: JSON.stringify({ email: store.owner.email, password: "password123" }) });
  const restock = await seller(`/api/seller/products/${tee.id}`, { method: "PATCH", body: JSON.stringify({ sizes: "S,M,L,XL,XXL", variants: [{ size: "S", stockQty: 50 }, { size: "M", stockQty: 50 }, { size: "L", stockQty: 50 }, { size: "XL", stockQty: 50 }, { size: "XXL", stockQty: 50 }] }) });
  check("seller restock sets total = sum of sizes", restock.body.product.stockQty === 250);
  const vAfter = await prisma.productVariant.findFirst({ where: { productId: tee.id, size: "S" } });
  check("seller restock updated the size's stock", vAfter.stockQty === 50);

  await prisma.$disconnect();
  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️ SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error("crashed:", e); process.exit(1); });
