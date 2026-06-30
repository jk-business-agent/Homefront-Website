// POST /api/seller/orders/[itemId]/deliver — mark a shipped item as delivered.
// When all of an order's items are delivered, the order flips to "DELIVERED".
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSeller } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  let user;
  try { user = await requireSeller(); } catch (e: any) {
    return NextResponse.json({ error: "Seller access required" }, { status: e?.message === "FORBIDDEN" ? 403 : 401 });
  }
  const { itemId } = await params;
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return NextResponse.json({ error: "No store found" }, { status: 404 });

  const item = await prisma.orderItem.findUnique({ where: { id: itemId } });
  if (!item || item.storeId !== store.id) return NextResponse.json({ error: "That item isn't part of your store" }, { status: 404 });

  await prisma.orderItem.update({ where: { id: itemId }, data: { fulfillmentStatus: "DELIVERED" } });

  const remaining = await prisma.orderItem.count({ where: { orderId: item.orderId, fulfillmentStatus: { not: "DELIVERED" } } });
  if (remaining === 0) {
    await prisma.order.update({ where: { id: item.orderId }, data: { status: "DELIVERED" } });
  }
  return NextResponse.json({ ok: true, fulfillmentStatus: "DELIVERED", orderFullyDelivered: remaining === 0 });
}
