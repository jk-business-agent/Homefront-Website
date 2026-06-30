// GET /api/admin/stats — platform-wide numbers + charts data for the admin dashboard.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);

  const [orders, items, productCount, sellerCount, buyerCount, subscriberCount, newUsers, recentOrders, stores] = await Promise.all([
    prisma.order.findMany({ select: { totalCents: true, createdAt: true } }),
    prisma.orderItem.findMany({ include: { product: { select: { name: true, emoji: true, category: true } }, order: { select: { createdAt: true } } } }),
    prisma.product.count(),
    prisma.user.count({ where: { role: "SELLER" } }),
    prisma.user.count({ where: { role: "BUYER" } }),
    prisma.subscriber.count(),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { buyer: { select: { name: true } } } }),
    prisma.store.findMany({ select: { id: true, name: true } }),
  ]);

  const storeName = new Map(stores.map((s) => [s.id, s.name]));
  const revenueCents = orders.reduce((s, o) => s + o.totalCents, 0);
  const ordersThisWeek = orders.filter((o) => o.createdAt >= weekAgo).length;

  // Top products by units.
  const byProduct = new Map<string, { name: string; emoji: string; units: number; revenueCents: number }>();
  // Sales by category.
  const byCategory = new Map<string, { units: number; revenueCents: number }>();
  // Top sellers by revenue.
  const bySeller = new Map<string, { name: string; units: number; revenueCents: number }>();

  for (const it of items) {
    const rev = it.unitPriceCents * it.quantity;
    const p = byProduct.get(it.productId) || { name: it.product.name, emoji: it.product.emoji, units: 0, revenueCents: 0 };
    p.units += it.quantity; p.revenueCents += rev; byProduct.set(it.productId, p);

    const c = byCategory.get(it.product.category) || { units: 0, revenueCents: 0 };
    c.units += it.quantity; c.revenueCents += rev; byCategory.set(it.product.category, c);

    const s = bySeller.get(it.storeId) || { name: storeName.get(it.storeId) || "Store", units: 0, revenueCents: 0 };
    s.units += it.quantity; s.revenueCents += rev; bySeller.set(it.storeId, s);
  }

  const topProducts = [...byProduct.values()].sort((a, b) => b.units - a.units).slice(0, 5);
  const salesByCategory = [...byCategory.entries()].map(([category, v]) => ({ category, ...v })).sort((a, b) => b.revenueCents - a.revenueCents);
  const topSellers = [...bySeller.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 5);

  // 14-day revenue + orders trend.
  const days: { day: string; label: string; revenueCents: number; orders: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push({ day: dayKey(d), label: d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }), revenueCents: 0, orders: 0 });
  }
  const byDay = new Map(days.map((d) => [d.day, d]));
  for (const o of orders) { const b = byDay.get(dayKey(o.createdAt)); if (b) { b.revenueCents += o.totalCents; b.orders += 1; } }

  return NextResponse.json({
    revenueCents, orderCount: orders.length, ordersThisWeek,
    productCount, sellerCount, buyerCount, subscriberCount, newUsersThisWeek: newUsers,
    topProducts, salesByCategory, topSellers, days,
    recentOrders: recentOrders.map((o) => ({ id: o.id, buyer: o.buyer.name, totalCents: o.totalCents, status: o.status, createdAt: o.createdAt })),
  });
}
