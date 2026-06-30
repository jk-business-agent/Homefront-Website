// Full order detail + printable invoice. Only the buyer who placed it can view.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatPrice, stars } from "@/lib/format";
import Flag from "@/components/Flag";
import PrintButton from "@/components/PrintButton";
import OrderProgress from "@/components/OrderProgress";
import ReorderButton from "@/components/ReorderButton";
import MessageMakerButton from "@/components/MessageMakerButton";
import NewsletterSignup from "@/components/NewsletterSignup";
import OrderActions from "@/components/OrderActions";

export const dynamic = "force-dynamic";

function badge(status: string) {
  const cls = status === "DELIVERED" ? "badge-shipped" : status === "SHIPPED" ? "badge-paid" : status === "PAID" ? "badge-paid" : "badge-pending";
  return <span className={`badge ${cls}`}>{status}</span>;
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/account/orders/${id}`);

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: { include: { store: { select: { id: true, name: true, slug: true, city: true, state: true } } } } } } },
  });
  if (!order || order.buyerId !== user!.id) notFound();

  const subtotal = order.items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
  const taxCents = Math.round(subtotal * 0.07);

  // Returns/cancellation eligibility for the action panel.
  const returns = await prisma.returnRequest.findMany({ where: { orderId: id }, select: { orderItemId: true, status: true } });
  const retByItem = new Map(returns.map((r) => [r.orderItemId, r.status]));
  const anyShipped = order.items.some((i) => i.fulfillmentStatus === "SHIPPED" || i.fulfillmentStatus === "DELIVERED");
  const cancellable = order.status === "PAID" && !anyShipped;
  const actionItems = order.items.map((i) => ({ id: i.id, name: i.product.name, quantity: i.quantity, fulfillmentStatus: i.fulfillmentStatus, returnStatus: retByItem.get(i.id) ?? null }));

  // Group items by the store/company that ships them.
  const byStore = new Map<string, { id: string; name: string; city: string | null; state: string | null; items: typeof order.items }>();
  for (const it of order.items) {
    const key = it.product.store.name;
    if (!byStore.has(key)) byStore.set(key, { id: it.product.store.id, name: key, city: it.product.store.city, state: it.product.store.state, items: [] as any });
    byStore.get(key)!.items.push(it);
  }
  const companies = Array.from(byStore.values());

  // Items shaped for the reorder button (re-add to cart).
  const reorderItems = order.items.map((it) => ({
    productId: it.productId, name: it.product.name, slug: it.product.slug, priceCents: it.product.priceCents,
    emoji: it.product.emoji, storeName: it.product.store.name, size: it.size, quantity: it.quantity,
  }));

  return (
    <div className="page" style={{ maxWidth: 820, margin: "0 auto" }}>
      <div className="breadcrumb" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/account">← Back to your orders</Link>
        <div style={{ display: "flex", gap: 8 }}>
          <ReorderButton items={reorderItems} />
          <PrintButton />
        </div>
      </div>

      {/* Live tracker */}
      <div className="panel no-print">
        <OrderProgress status={order.status} />
        {order.items.some((i) => i.trackingNumber) && (
          <div style={{ textAlign: "center", marginTop: 12, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--muted)" }}>
            Tracking: {order.items.filter((i) => i.trackingNumber).map((i) => `${i.trackingCarrier} ${i.trackingNumber}`).join(" · ")}
          </div>
        )}
      </div>

      <div className="panel" id="invoice">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>Order #{order.id.slice(-6).toUpperCase()} {badge(order.status)}</h2>
            <div style={{ color: "var(--muted)", fontFamily: "var(--font-body)", fontSize: 14 }}>
              Placed {new Date(order.createdAt).toLocaleString()}
            </div>
          </div>
          <div className="logo">
            <span className="wordmark"><span className="hf" style={{ color: "var(--navy)" }}>HOMEFRONT</span><span className="mk">★ <b>MARKETS</b> ★</span></span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, margin: "18px 0" }}>
          <div className="ship-to">
            <strong>📮 Shipping to</strong>
            <div>{order.shippingName}</div>
            <div>{order.shippingLine1}</div>
            <div>{order.shippingCity}, {order.shippingState} {order.shippingZip}</div>
          </div>
          <div className="ship-to">
            <strong>🚚 Shipping method</strong>
            <div>{order.shippingService || "Standard"}</div>
            <div style={{ marginTop: 6 }}><strong>Status:</strong> {order.status}</div>
          </div>
        </div>

        {/* Items grouped by the American company that makes/ships them */}
        {companies.map((c) => (
          <div key={c.name} style={{ borderTop: "1px solid var(--line)", paddingTop: 14, marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <strong style={{ fontFamily: "var(--font-head)", textTransform: "uppercase", letterSpacing: ".3px", color: "var(--navy)" }}>{c.name}</strong>
              {(c.city || c.state) && (
                <span style={{ fontSize: 12, color: "var(--green)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Flag size={12} /> Made in {[c.city, c.state].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
            {c.items.map((it) => (
              <div className="line-item" key={it.id}>
                <span className="emoji">{it.product.emoji}</span>
                <div style={{ flex: 1 }}>
                  <Link href={`/products/${it.product.slug}`} style={{ fontSize: 14, fontWeight: 600 }}>{it.product.name}</Link>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    Qty {it.quantity}{it.size ? ` · Size ${it.size}` : ""} · {formatPrice(it.unitPriceCents)} each
                    {it.trackingNumber ? <> · <span className="tracking-pill">🚚 {it.trackingCarrier}: {it.trackingNumber}</span></> : ""}
                  </div>
                </div>
                <span className="cprice">{formatPrice(it.unitPriceCents * it.quantity)}</span>
              </div>
            ))}
            <div className="no-print" style={{ maxWidth: 300 }}>
              <MessageMakerButton storeId={c.id} storeName={c.name} productName={`Order #${order.id.slice(-6).toUpperCase()}`} />
            </div>
          </div>
        ))}

        {/* Totals */}
        <div style={{ borderTop: "2px solid var(--line)", marginTop: 16, paddingTop: 14, maxWidth: 320, marginLeft: "auto" }}>
          <div className="row"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
          {order.discountCents > 0 && <div className="row"><span style={{ color: "var(--green)" }}>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span><span style={{ color: "var(--green)" }}>−{formatPrice(order.discountCents)}</span></div>}
          <div className="row"><span>Shipping ({order.shippingService || "Standard"})</span><span>{formatPrice(order.shippingCents)}</span></div>
          <div className="row"><span>Estimated tax</span><span>{formatPrice(taxCents)}</span></div>
          <div className="row total"><span>Total</span><span>{formatPrice(order.totalCents)}</span></div>
        </div>

        <p style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "var(--green)", fontFamily: "var(--font-body)" }}>
          <Flag size={12} /> Thank you for keeping America working.
        </p>
      </div>

      {/* Cancel / returns */}
      <OrderActions orderId={order.id} status={order.status} cancellable={cancellable} items={actionItems} />

      {/* Post-purchase: invite to the newsletter with a next-order incentive */}
      <div className="panel no-print" style={{ textAlign: "center" }}>
        <h3 style={{ margin: "0 0 4px" }}>🎁 Get 10% off your next order</h3>
        <p className="panel-sub" style={{ marginTop: 0 }}>Join the newsletter for maker stories &amp; new drops — we'll send a code.</p>
        <div style={{ maxWidth: 440, margin: "0 auto" }}>
          <NewsletterSignup source="footer" buttonLabel="Get my code" />
        </div>
      </div>
    </div>
  );
}
