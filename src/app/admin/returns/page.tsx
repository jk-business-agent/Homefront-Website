"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AdminNav from "@/components/AdminNav";
import { formatPrice } from "@/lib/format";

type Ret = {
  id: string; productName: string; quantity: number; reason: string; status: string;
  refundCents: number; createdAt: string; buyerEmail: string; storeName: string; adminNote: string | null;
};

const BADGE: Record<string, string> = { REQUESTED: "badge-pending", REFUNDED: "badge-shipped", REJECTED: "badge-paid" };

export default function AdminReturns() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [returns, setReturns] = useState<Ret[]>([]);
  const [filter, setFilter] = useState("all");
  const [restock, setRestock] = useState<Record<string, boolean>>({});

  const load = useCallback((f = "all") => {
    fetch(`/api/admin/returns${f !== "all" ? `?status=${f.toUpperCase()}` : ""}`, { cache: "no-store" }).then((r) => r.json()).then((d) => setReturns(d.returns || []));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login?next=/admin/returns"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
    load(filter);
  }, [user, loading, router, load, filter]);

  async function resolve(id: string, action: "refund" | "reject") {
    await fetch(`/api/admin/returns/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, restock: restock[id] ?? true }) });
    load(filter);
  }

  if (loading || !user || user.role !== "ADMIN") return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;

  return (
    <div className="page">
      <AdminNav />
      <h1 style={{ color: "var(--navy)", fontSize: 26, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>Returns &amp; Refunds</h1>
      <p style={{ color: "var(--muted)", marginTop: 0, fontFamily: "var(--font-body)" }}>Review buyer return requests, then refund (optionally restocking the item) or decline.</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {["all", "requested", "refunded", "rejected"].map((f) => (
          <button key={f} className={`btn ${filter === f ? "btn-navy" : "btn-outline"}`} style={{ padding: "6px 13px", textTransform: "capitalize" }} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      <div className="panel">
        {returns.length === 0 && <p style={{ color: "var(--muted)" }}>No return requests here.</p>}
        {returns.map((r) => (
          <div className="order-card" key={r.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>
                  {r.productName} <span style={{ color: "var(--muted)", fontWeight: 400 }}>× {r.quantity}</span>{" "}
                  <span className={`badge ${BADGE[r.status] || "badge-pending"}`}>{r.status}</span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", fontFamily: "var(--font-body)" }}>
                  {r.buyerEmail} · sold by {r.storeName} · {new Date(r.createdAt).toLocaleDateString()} · refund {formatPrice(r.refundCents)}
                </div>
                <div style={{ fontSize: 13.5, fontFamily: "var(--font-body)", marginTop: 4 }}><strong>Reason:</strong> {r.reason}</div>
                {r.adminNote && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Note: {r.adminNote}</div>}
              </div>
              {r.status === "REQUESTED" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                  <label style={{ fontSize: 12, color: "var(--muted)" }}>
                    <input type="checkbox" checked={restock[r.id] ?? true} onChange={(e) => setRestock((s) => ({ ...s, [r.id]: e.target.checked }))} /> restock item
                  </label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-navy" style={{ padding: "6px 12px" }} onClick={() => resolve(r.id, "refund")}>💵 Refund</button>
                    <button className="btn btn-outline" style={{ padding: "6px 12px" }} onClick={() => resolve(r.id, "reject")}>Decline</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 10, fontSize: 13 }}><Link href="/admin" className="muted-link">← Back to dashboard</Link></p>
    </div>
  );
}
