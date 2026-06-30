"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatPrice } from "@/lib/format";

type Item = {
  id: string; quantity: number; size?: string | null; unitPriceCents: number; fulfillmentStatus: string;
  trackingCarrier?: string | null; trackingNumber?: string | null;
  product: { name: string; emoji: string };
};
type Order = {
  id: string; status: string; totalCents: number; createdAt: string;
  shippingCity: string; shippingState: string; items: Item[];
};

function badge(status: string) {
  const cls = status === "SHIPPED" ? "badge-shipped" : status === "PAID" ? "badge-paid" : "badge-pending";
  return <span className={`badge ${cls}`}>{status}</span>;
}

export default function OrdersPage() {
  const params = useSearchParams();
  const placedId = params.get("placed");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="panel">
      <h2>Your Orders</h2>
      <p className="panel-sub">Everything you've ordered from American makers.</p>

      {placedId && (
        <div className="alert alert-ok">🎉 Order placed! Your American-made goods are on the way. Order #{placedId.slice(-6).toUpperCase()}.</div>
      )}

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading orders…</p>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="b">📦</div>
          <p style={{ marginTop: 12 }}>No orders yet.</p>
          <Link href="/" className="btn btn-navy" style={{ marginTop: 14 }}>Start shopping</Link>
        </div>
      ) : (
        orders.map((o) => (
          <Link className="order-card" key={o.id} href={`/account/orders/${o.id}`} style={{ display: "block" }}>
            <div className="oc-head">
              <div>
                <strong>Order #{o.id.slice(-6).toUpperCase()}</strong> {badge(o.status)}
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  Placed {new Date(o.createdAt).toLocaleDateString()} · Ship to {o.shippingCity}, {o.shippingState}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 800, color: "var(--navy)", fontFamily: "var(--font-head)" }}>{formatPrice(o.totalCents)}</div>
                <div style={{ fontSize: 12, color: "var(--barn)", fontWeight: 600 }}>View details →</div>
              </div>
            </div>
            {o.items.map((it) => (
              <div className="line-item" key={it.id}>
                <span className="emoji">{it.product.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{it.product.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Qty {it.quantity}{it.size ? ` · Size ${it.size}` : ""}</div>
                  {it.trackingNumber && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      <span className="tracking-pill">🚚 {it.trackingCarrier}: {it.trackingNumber}</span>
                    </div>
                  )}
                </div>
                <span className="cprice">{formatPrice(it.unitPriceCents * it.quantity)}</span>
              </div>
            ))}
          </Link>
        ))
      )}
    </div>
  );
}
