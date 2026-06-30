// GET /api/seller/sales — sales analytics for the seller's store.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSeller } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  let user;
  try { user = await requireSeller(); } catch { return NextResponse.json({ error: "Seller access required" }, { status: 401 }); }
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return NextResponse.json({ error: "No store found" }, { status: 404 });

  const items = await prisma.orderItem.findMany({
    where: { storeId: store.id },
    include: { product: { select: { name: true, emoji: true } }, order: { select: { createdAt: true } } },
  });

  const revenueCents = items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
  const unitsSold = items.reduce((s, i) => s + i.quantity, 0);
  const orderIds = new Set(items.map((i) => i.orderId));
  const shipped = items.filter((i) => i.fulfillmentStatus === "SHIPPED").length;
  const pending = items.filter((i) => i.fulfillmentStatus === "PENDING").length;

  // Top products by revenue.
  const byProduct = new Map<string, { name: string; emoji: string; units: number; revenueCents: number }>();
  for (const i of items) {
    const key = i.productId;
    const cur = byProduct.get(key) || { name: i.product.name, emoji: i.product.emoji, units: 0, revenueCents: 0 };
    cur.units += i.quantity;
    cur.revenueCents += i.unitPriceCents * i.quantity;
    byProduct.set(key, cur);
  }
  const topProducts = Array.from(byProduct.values()).sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 5);

  // Revenue per day for the last 14 days (for the trend chart).
  const DAYS = 14;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const buckets: { label: string; day: string; revenueCents: number; orders: number }[] = [];
  const index = new Map<string, number>();
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    index.set(key, buckets.length);
    buckets.push({ label: d.toLocaleDateString(undefined, { month: "numeric", day: "numeric" }), day: key, revenueCents: 0, orders: 0 });
  }
  const ordersByDay = new Map<string, Set<string>>();
  for (const i of items) {
    const key = new Date(i.order.createdAt).toISOString().slice(0, 10);
    const b = index.get(key);
    if (b === undefined) continue;
    buckets[b].revenueCents += i.unitPriceCents * i.quantity;
    if (!ordersByDay.has(key)) ordersByDay.set(key, new Set());
    ordersByDay.get(key)!.add(i.orderId);
  }
  for (const [key, set] of ordersByDay) { const b = index.get(key); if (b !== undefined) buckets[b].orders = set.size; }

  const avgOrderCents = orderIds.size ? Math.round(revenueCents / orderIds.size) : 0;

  return NextResponse.json({
    revenueCents,
    unitsSold,
    orderCount: orderIds.size,
    itemsShipped: shipped,
    itemsPending: pending,
    avgOrderCents,
    days: buckets,
    topProducts,
  });
}
