// POST /api/orders/[id]/cancel — buyer cancels an order that hasn't shipped yet.
// Marks it cancelled and restocks inventory. (Refund is simulated until Stripe.)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Please sign in" }, { status: 401 }); }
  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order || order.buyerId !== user.id) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status === "CANCELLED") return NextResponse.json({ error: "This order is already cancelled." }, { status: 400 });

  // Only cancellable before anything ships.
  const shipped = order.items.some((i) => i.fulfillmentStatus === "SHIPPED" || i.fulfillmentStatus === "DELIVERED");
  if (order.status !== "PAID" || shipped) {
    return NextResponse.json({ error: "This order has already shipped — please request a return instead." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id }, data: { status: "CANCELLED" } });
    await tx.orderItem.updateMany({ where: { orderId: id }, data: { fulfillmentStatus: "CANCELLED" } });
    // Restock each item (and the specific size if applicable).
    for (const it of order.items) {
      await tx.product.update({ where: { id: it.productId }, data: { stockQty: { increment: it.quantity } } });
      if (it.size) await tx.productVariant.updateMany({ where: { productId: it.productId, size: it.size }, data: { stockQty: { increment: it.quantity } } });
    }
  });

  return NextResponse.json({ ok: true, cancelled: true });
}
