// POST /api/seller/orders/[itemId]/label — buy a shipping label for one item.
// The platform creates the label; the seller just prints it. Tracking is captured
// automatically and the item is marked shipped.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSeller } from "@/lib/auth";
import { buyLabel } from "@/lib/shipping-labels";
import { sendEmail, brandEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  let user;
  try { user = await requireSeller(); } catch (e: any) {
    return NextResponse.json({ error: "Seller access required" }, { status: e?.message === "FORBIDDEN" ? 403 : 401 });
  }
  const { itemId } = await params;
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return NextResponse.json({ error: "No store found" }, { status: 404 });

  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { order: true, product: { select: { name: true, weightOz: true } } },
  });
  if (!item || item.storeId !== store.id) return NextResponse.json({ error: "That item isn't part of your store" }, { status: 404 });
  if (item.labelUrl) return NextResponse.json({ error: "A label has already been created for this item" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const service = typeof body?.service === "string" ? body.service : undefined;

  // Ship-from = seller's address (falls back to their city/state).
  const from = {
    name: store.name,
    street1: store.shipFromLine1 || "1 Maker Way",
    city: store.shipFromCity || store.city || "Columbus",
    state: store.shipFromState || store.state || "OH",
    zip: store.shipFromZip || "43004",
  };
  const to = {
    name: item.order.shippingName,
    street1: item.order.shippingLine1,
    city: item.order.shippingCity,
    state: item.order.shippingState,
    zip: item.order.shippingZip,
  };
  const weightOz = (item.product.weightOz ?? 16) * item.quantity;

  let result;
  try {
    result = await buyLabel({ from, to, weightOz, service });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not create label" }, { status: 502 });
  }

  const labelUrl = result.labelUrl || `/label/${itemId}`;
  await prisma.orderItem.update({
    where: { id: itemId },
    data: {
      fulfillmentStatus: "SHIPPED",
      trackingCarrier: result.carrier,
      trackingNumber: result.trackingNumber,
      labelUrl,
      shipmentId: result.shipmentId,
      shippedAt: new Date(),
    },
  });

  // Notify the buyer that their item shipped (best-effort).
  const buyer = await prisma.user.findUnique({ where: { id: item.order.buyerId }, select: { email: true, name: true } });
  if (buyer) {
    sendEmail({
      to: buyer.email,
      subject: `📦 Your ${item.product.name} has shipped!`,
      html: brandEmail("It's on the way! 📦", `
        <p>Hi ${buyer.name.split(" ")[0]}, your <strong>${item.product.name}</strong> from ${store.name} just shipped.</p>
        <p>Carrier: <strong>${result.carrier}</strong><br/>Tracking: <strong>${result.trackingNumber}</strong></p>`,
        { label: "Track your order", url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/account/orders/${item.orderId}` }),
    }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    labelUrl,
    trackingNumber: result.trackingNumber,
    carrier: result.carrier,
    rateCents: result.rateCents,
    simulated: result.simulated,
  });
}
