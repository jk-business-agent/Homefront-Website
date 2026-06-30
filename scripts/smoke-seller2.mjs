// Tests for seller upgrades: bulk price/stock edits + enhanced sales analytics.
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
  console.log(`\nTesting seller upgrades at ${BASE}\n`);
  const seller = client();
  await seller("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "seller5@demo.com", password: "password123" }) });

  console.log("1. Bulk price/stock edits");
  const mine = (await seller("/api/seller/products")).body.products || [];
  check("seller has products", mine.length >= 1);
  const a = mine[0];
  const newPrice = a.priceCents + 111;
  const newStock = (a.stockQty ?? 0) + 7;

  // A product that is NOT this seller's, to verify the ownership guard.
  const all = (await client()("/api/products")).body.products || [];
  const foreign = all.find((p) => !mine.some((m) => m.id === p.id));

  const updates = [{ id: a.id, priceCents: newPrice, stockQty: newStock }];
  if (foreign) updates.push({ id: foreign.id, priceCents: 1 });
  const res = await seller("/api/seller/products/bulk", { method: "PATCH", body: JSON.stringify({ updates }) });
  check("bulk update succeeds", res.status === 200);
  check("only owned products updated (foreign ignored)", res.body.updated === 1);

  const after = (await seller("/api/seller/products")).body.products || [];
  const updatedA = after.find((p) => p.id === a.id);
  check("price updated", updatedA?.priceCents === newPrice);
  check("stock updated", updatedA?.stockQty === newStock);

  if (foreign) {
    const foreignAfter = (await client()("/api/products")).body.products.find((p) => p.id === foreign.id);
    check("foreign product was NOT changed", foreignAfter && foreignAfter.priceCents !== 1);
  }

  console.log("2. Sales analytics");
  const sales = await seller("/api/seller/sales");
  check("sales returns 14-day revenue series", Array.isArray(sales.body.days) && sales.body.days.length === 14);
  check("each day has revenueCents", sales.body.days.every((d) => typeof d.revenueCents === "number"));
  check("returns average order value", typeof sales.body.avgOrderCents === "number");
  check("returns top products array", Array.isArray(sales.body.topProducts));

  console.log("3. Validation");
  const bad = await seller("/api/seller/products/bulk", { method: "PATCH", body: JSON.stringify({ updates: [] }) });
  check("empty updates rejected (400)", bad.status === 400);
  const anon = await client()("/api/seller/products/bulk", { method: "PATCH", body: JSON.stringify({ updates: [{ id: a.id, priceCents: 100 }] }) });
  check("non-seller blocked (401)", anon.status === 401);

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
