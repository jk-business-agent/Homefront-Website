"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: string; name: string; quantity: number; fulfillmentStatus: string; returnStatus: string | null };

const RET_BADGE: Record<string, { label: string; cls: string }> = {
  REQUESTED: { label: "Return requested", cls: "badge-pending" },
  REFUNDED: { label: "Refunded", cls: "badge-shipped" },
  REJECTED: { label: "Return declined", cls: "badge-pending" },
};

export default function OrderActions({ orderId, status, cancellable, items }: { orderId: string; status: string; cancellable: boolean; items: Item[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [openReturn, setOpenReturn] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  async function cancel() {
    if (!confirm("Cancel this order? Your items go back in stock and you'll be refunded.")) return;
    setBusy(true); setErr("");
    const res = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
    const d = await res.json(); setBusy(false);
    if (!res.ok) { setErr(d.error || "Could not cancel"); return; }
    router.refresh();
  }
  async function requestReturn(orderItemId: string) {
    setBusy(true); setErr("");
    const res = await fetch(`/api/orders/${orderId}/return`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderItemId, reason }) });
    const d = await res.json(); setBusy(false);
    if (!res.ok) { setErr(d.error || "Could not request return"); return; }
    setOpenReturn(null); setReason(""); router.refresh();
  }

  const returnable = items.filter((i) => ["SHIPPED", "DELIVERED"].includes(i.fulfillmentStatus) || i.returnStatus);

  if (status === "CANCELLED") {
    return <div className="panel no-print"><div className="alert" style={{ margin: 0, background: "#f6e7cf", border: "1px solid #e2c489", color: "#8a5a18" }}>✖ This order was cancelled and items were restocked. Your refund has been issued.</div></div>;
  }

  return (
    <div className="panel no-print">
      <h3 style={{ marginTop: 0 }}>Need to make a change?</h3>
      {err && <div className="alert alert-error">{err}</div>}

      {cancellable && (
        <div style={{ marginBottom: returnable.length ? 16 : 0 }}>
          <p className="panel-sub" style={{ marginTop: 0 }}>This order hasn't shipped yet — you can still cancel it for a full refund.</p>
          <button className="btn" style={{ color: "#a11", border: "1px solid #a11", background: "transparent" }} disabled={busy} onClick={cancel}>Cancel order</button>
        </div>
      )}

      {returnable.length > 0 && (
        <div>
          <p className="panel-sub" style={{ marginTop: cancellable ? 16 : 0 }}>Shipped items can be returned for a refund.</p>
          {returnable.map((it) => (
            <div className="line-item" key={it.id} style={{ borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{it.name} <span style={{ color: "var(--muted)", fontWeight: 400 }}>· Qty {it.quantity}</span></div>
              </div>
              {it.returnStatus ? (
                <span className={`badge ${RET_BADGE[it.returnStatus]?.cls || "badge-pending"}`}>{RET_BADGE[it.returnStatus]?.label || it.returnStatus}</span>
              ) : openReturn === it.id ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", width: "100%", marginTop: 8 }}>
                  <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for return…" style={{ flex: 1, minWidth: 200, border: "1.5px solid var(--line)", borderRadius: 8, padding: "8px 11px", fontFamily: "var(--font-body)" }} />
                  <button className="btn btn-navy" style={{ padding: "8px 14px" }} disabled={busy || reason.trim().length < 3} onClick={() => requestReturn(it.id)}>Submit return</button>
                  <button className="btn btn-outline" style={{ padding: "8px 14px" }} onClick={() => { setOpenReturn(null); setReason(""); }}>Cancel</button>
                </div>
              ) : (
                <button className="btn btn-outline" style={{ padding: "6px 12px" }} onClick={() => { setOpenReturn(it.id); setReason(""); }}>Request return</button>
              )}
            </div>
          ))}
        </div>
      )}

      {!cancellable && returnable.length === 0 && (
        <p className="panel-sub" style={{ margin: 0 }}>No actions available for this order right now.</p>
      )}
    </div>
  );
}
