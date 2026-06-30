// GET /api/seller/orders — every line item this seller needs to fulfill.
// Grouped by order so the seller sees who ordered what and where to ship it.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSeller } from "@/lib/auth";

// Always read live, per-seller data — never serve a cached response.
export const dynamic = "force-dynamic";

export async function GET() {
  let user;
  try {
    user = await requireSeller();
  } catch (e: any) {
    const code = e?.message === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: "Seller access required" }, { status: code });
  }

  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return NextResponse.json({ error: "No store found for this account" }, { status: 404 });

  const items = await prisma.orderItem.findMany({
    where: { storeId: store.id },
    orderBy: { order: { createdAt: "desc" } },
    include: {
      product: { select: { name: true, emoji: true } },
      order: {
        select: {
          id: true, status: true, createdAt: true,
          shippingName: true, shippingLine1: true, shippingCity: true,
          shippingState: true, shippingZip: true,
        },
      },
    },
  });

  // Group line items under their order for an easy "to ship" list.
  const ordersMap = new Map<string, any>();
  for (const item of items) {
    const o = item.order;
    if (!ordersMap.has(o.id)) {
      ordersMap.set(o.id, {
        orderId: o.id,
        placedAt: o.createdAt,
        status: o.status,
        shipTo: {
          name: o.shippingName, line1: o.shippingLine1,
          city: o.shippingCity, state: o.shippingState, zip: o.shippingZip,
        },
        items: [],
      });
    }
    ordersMap.get(o.id).items.push({
      itemId: item.id,
      product: item.product.name,
      emoji: item.product.emoji,
      quantity: item.quantity,
      size: item.size,
      unitPriceCents: item.unitPriceCents,
      fulfillmentStatus: item.fulfillmentStatus,
      trackingCarrier: item.trackingCarrier,
      trackingNumber: item.trackingNumber,
      labelUrl: item.labelUrl,
    });
  }

  const orders = Array.from(ordersMap.values());
  const pending = orders.filter((o) => o.items.some((i: any) => i.fulfillmentStatus === "PENDING")).length;
  return NextResponse.json({ store: { name: store.name }, ordersToFulfill: orders, pendingCount: pending });
}
