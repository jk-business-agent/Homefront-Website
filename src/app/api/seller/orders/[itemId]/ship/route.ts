// POST /api/seller/orders/[itemId]/ship — mark one order line item as shipped.
// When every item in an order is shipped, the whole order flips to "SHIPPED".
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSeller } from "@/lib/auth";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  let user;
  try {
    user = await requireSeller();
  } catch (e: any) {
    const code = e?.message === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: "Seller access required" }, { status: code });
  }

  const { itemId } = await params;
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return NextResponse.json({ error: "No store found" }, { status: 404 });

  const item = await prisma.orderItem.findUnique({ where: { id: itemId } });
  if (!item || item.storeId !== store.id) {
    return NextResponse.json({ error: "That item isn't part of your store" }, { status: 404 });
  }

  // Optional tracking info entered by the seller.
  const body = await _req.json().catch(() => ({}));
  const trackingCarrier = typeof body?.carrier === "string" ? body.carrier : null;
  const trackingNumber = typeof body?.trackingNumber === "string" ? body.trackingNumber : null;

  await prisma.orderItem.update({
    where: { id: itemId },
    data: { fulfillmentStatus: "SHIPPED", trackingCarrier, trackingNumber },
  });

  // If no items in this order are still pending, mark the order shipped.
  const remaining = await prisma.orderItem.count({
    where: { orderId: item.orderId, fulfillmentStatus: "PENDING" },
  });
  if (remaining === 0) {
    await prisma.order.update({ where: { id: item.orderId }, data: { status: "SHIPPED" } });
  }

  return NextResponse.json({ ok: true, itemId, fulfillmentStatus: "SHIPPED", orderFullyShipped: remaining === 0 });
}
