// Printable packing slip for one order (only the items this seller ships).
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function PackingSlip({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/seller/packing-slip/${orderId}`);
  if (user!.role !== "SELLER" && user!.role !== "ADMIN") notFound();

  const store = await prisma.store.findUnique({ where: { ownerId: user!.id } });
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { select: { name: true, emoji: true } } } } },
  });
  if (!order) notFound();

  // Only the items this seller ships (admins see all).
  const myItems = user!.role === "ADMIN" ? order.items : order.items.filter((i) => store && i.storeId === store.id);
  if (myItems.length === 0) notFound();

  return (
    <div className="page" style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="breadcrumb no-print" style={{ display: "flex", justifyContent: "space-between" }}>
        <Link href="/seller">← Back to dashboard</Link>
        <PrintButton />
      </div>

      <div className="ship-label" style={{ maxWidth: "none" }}>
        <div className="sl-top">
          <div className="sl-carrier" style={{ fontSize: 20 }}>PACKING SLIP</div>
          <div className="sl-service">Order #{order.id.slice(-6).toUpperCase()}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, margin: "10px 0 14px", fontFamily: "var(--font-body)", fontSize: 14 }}>
          <div><strong>From:</strong><div>{store?.name || "Homefront Maker"}</div></div>
          <div><strong>Ship to:</strong><div>{order.shippingName}</div><div>{order.shippingLine1}</div><div>{order.shippingCity}, {order.shippingState} {order.shippingZip}</div></div>
        </div>
        <div style={{ borderTop: "2px solid var(--ink)", paddingTop: 10 }}>
          {myItems.map((it) => (
            <div key={it.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #ddd", fontFamily: "var(--font-body)" }}>
              <span>{it.product.emoji} {it.product.name}{it.size ? ` — Size ${it.size}` : ""}</span>
              <strong>Qty {it.quantity}</strong>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, fontFamily: "var(--font-body)" }}>Thank you for buying American 🇺🇸</p>
      </div>
    </div>
  );
}
