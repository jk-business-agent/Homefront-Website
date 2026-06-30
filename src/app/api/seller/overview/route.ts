// GET /api/seller/overview — daily views + orders for the last 7 days, plus growth milestones.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSeller } from "@/lib/auth";

export const dynamic = "force-dynamic";

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  let user;
  try { user = await requireSeller(); } catch { return NextResponse.json({ error: "Seller access required" }, { status: 401 }); }
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return NextResponse.json({ error: "No store found" }, { status: 404 });

  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const [views, items] = await Promise.all([
    prisma.productView.findMany({ where: { storeId: store.id, createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.orderItem.findMany({ where: { storeId: store.id }, include: { order: { select: { createdAt: true } } } }),
  ]);

  // Build the last 7 day buckets.
  const days: { day: string; label: string; views: number; orders: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ day: dayKey(d), label: d.toLocaleDateString("en-US", { weekday: "short" }), views: 0, orders: 0 });
  }
  const byKey = new Map(days.map((d) => [d.day, d]));
  for (const v of views) { const b = byKey.get(dayKey(v.createdAt)); if (b) b.views++; }
  for (const it of items) { const b = byKey.get(dayKey(it.order.createdAt)); if (b) b.orders += it.quantity; }

  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
  const viewsTotal = views.length;
  const ordersThisWeek = days.reduce((s, d) => s + d.orders, 0);

  // Growth milestones / rewards.
  const milestones = [
    { units: 1, title: "First sale", reward: "Welcome gift + a shout-out in our newsletter", emoji: "🎉" },
    { units: 5, title: "5 items sold", reward: "Featured on the Homefront homepage", emoji: "⭐" },
    { units: 10, title: "10 items sold", reward: "$30 in store-wide promotions", emoji: "💰" },
    { units: 50, title: "50 items sold", reward: "Top Maker badge + premium placement", emoji: "🏅" },
  ].map((m) => ({ ...m, achieved: totalUnits >= m.units, progress: Math.min(1, totalUnits / m.units) }));

  const nextMilestone = milestones.find((m) => !m.achieved) || null;

  return NextResponse.json({
    days,
    viewsTotal,
    ordersThisWeek,
    totalUnits,
    milestones,
    nextMilestone,
    featured: totalUnits >= 5,
  });
}
