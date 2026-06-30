// GET /api/seller/orders/export — download the seller's orders as a CSV.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSeller } from "@/lib/auth";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  let user;
  try { user = await requireSeller(); } catch { return NextResponse.json({ error: "Seller access required" }, { status: 401 }); }
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return NextResponse.json({ error: "No store" }, { status: 404 });

  const items = await prisma.orderItem.findMany({
    where: { storeId: store.id },
    orderBy: { order: { createdAt: "desc" } },
    include: { product: { select: { name: true } }, order: true },
  });

  const headers = ["Order", "Date", "Product", "Size", "Qty", "Unit Price", "Status", "Carrier", "Tracking", "Ship To", "Address", "City", "State", "ZIP"];
  const rows = items.map((it) => [
    `#${it.orderId.slice(-6).toUpperCase()}`,
    new Date(it.order.createdAt).toLocaleDateString(),
    it.product.name, it.size || "", it.quantity, (it.unitPriceCents / 100).toFixed(2),
    it.fulfillmentStatus, it.trackingCarrier || "", it.trackingNumber || "",
    it.order.shippingName, it.order.shippingLine1, it.order.shippingCity, it.order.shippingState, it.order.shippingZip,
  ]);

  const csv = [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="homefront-orders-${store.slug}.csv"`,
    },
  });
}
