// POST /api/orders/[id]/return — buyer requests a return/refund for one item.
//   body: { orderItemId, reason }
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({ orderItemId: z.string(), reason: z.string().min(3, "Tell us why").max(500) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Please sign in" }, { status: 401 }); }
  const { id: orderId } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: { include: { product: { select: { name: true } } } } } });
  if (!order || order.buyerId !== user.id) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const item = order.items.find((i) => i.id === parsed.data.orderItemId);
  if (!item) return NextResponse.json({ error: "Item not in this order" }, { status: 404 });
  // Returns are for items that actually shipped/delivered.
  if (!["SHIPPED", "DELIVERED"].includes(item.fulfillmentStatus)) {
    return NextResponse.json({ error: "You can request a return once the item has shipped. (Not yet shipped? Cancel the order instead.)" }, { status: 400 });
  }
  // One open request per item.
  const existing = await prisma.returnRequest.findFirst({ where: { orderItemId: item.id, status: { in: ["REQUESTED", "REFUNDED"] } } });
  if (existing) return NextResponse.json({ error: "A return is already on file for this item." }, { status: 409 });

  const ret = await prisma.returnRequest.create({
    data: {
      orderId, orderItemId: item.id, userId: user.id, storeId: item.storeId,
      productName: item.product.name, quantity: item.quantity, reason: parsed.data.reason,
      refundCents: item.unitPriceCents * item.quantity, status: "REQUESTED",
    },
  });
  return NextResponse.json({ returnRequest: ret }, { status: 201 });
}
