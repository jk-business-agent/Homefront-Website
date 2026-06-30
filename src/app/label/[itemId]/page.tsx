// A printable shipping label. Used in simulation mode and as a fallback.
// Only the seller who owns the item (or an admin) can view it.
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function LabelPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/label/${itemId}`);

  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { order: true, product: { select: { name: true, weightOz: true } } },
  });
  if (!item) notFound();

  const store = await prisma.store.findUnique({ where: { id: item.storeId } });
  const isOwner = store && store.ownerId === user!.id;
  if (!isOwner && user!.role !== "ADMIN") notFound();

  const from = {
    name: store?.name || "Homefront Maker",
    line1: store?.shipFromLine1 || "1 Maker Way",
    city: store?.shipFromCity || store?.city || "Columbus",
    state: store?.shipFromState || store?.state || "OH",
    zip: store?.shipFromZip || "43004",
  };
  const o = item.order;
  const weightOz = (item.product.weightOz ?? 16) * item.quantity;

  return (
    <div className="page" style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="breadcrumb no-print" style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Shipping label · Order #{o.id.slice(-6).toUpperCase()}</span>
        <PrintButton />
      </div>

      <div className="ship-label">
        <div className="sl-top">
          <div className="sl-carrier">{item.trackingCarrier || "USPS"}</div>
          <div className="sl-service">GROUND · {Math.max(1, Math.ceil(weightOz / 16))} lb</div>
        </div>

        <div className="sl-addr">
          <div className="sl-label">FROM</div>
          <strong>{from.name}</strong>
          <div>{from.line1}</div>
          <div>{from.city}, {from.state} {from.zip}</div>
        </div>

        <div className="sl-addr sl-to">
          <div className="sl-label">SHIP TO</div>
          <strong>{o.shippingName}</strong>
          <div>{o.shippingLine1}</div>
          <div>{o.shippingCity}, {o.shippingState} {o.shippingZip}</div>
        </div>

        {/* faux barcode */}
        <div className="sl-barcode">
          {Array.from({ length: 60 }).map((_, i) => (
            <span key={i} style={{ width: (i * 7) % 3 === 0 ? 3 : 1 }} />
          ))}
        </div>
        <div className="sl-track">{item.trackingNumber || "TRACKING PENDING"}</div>
        <div className="sl-item">{item.product.name} × {item.quantity}</div>
      </div>

      <p className="no-print" style={{ color: "var(--muted)", fontSize: 13, marginTop: 14 }}>
        This is a {item.shipmentId ? "carrier" : "simulated"} label. Hit Print, tape it on the box, and ship it —
        tracking is already saved to the order.
      </p>
    </div>
  );
}
