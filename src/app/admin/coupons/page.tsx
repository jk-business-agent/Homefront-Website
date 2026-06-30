"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AdminNav from "@/components/AdminNav";
import { formatPrice } from "@/lib/format";

type Coupon = { id: string; code: string; type: string; value: number; active: boolean; minSubtotalCents: number; maxUses: number | null; usedCount: number };

export default function AdminCoupons() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [f, setF] = useState({ code: "", type: "PERCENT", value: "10", minSubtotal: "0", maxUses: "" });
  const [err, setErr] = useState(""); const [msg, setMsg] = useState("");

  const load = useCallback(() => { fetch("/api/admin/coupons", { cache: "no-store" }).then((r) => r.json()).then((d) => setCoupons(d.coupons || [])); }, []);
  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login?next=/admin/coupons"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
    load();
  }, [user, loading, router, load]);
  function set(k: string, v: string) { setF((x) => ({ ...x, [k]: v })); }

  async function create(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setMsg("");
    const res = await fetch("/api/admin/coupons", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: f.code, type: f.type, value: parseInt(f.value || "0", 10),
        minSubtotalCents: Math.round(parseFloat(f.minSubtotal || "0") * 100),
        maxUses: f.maxUses ? parseInt(f.maxUses, 10) : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "Could not create"); return; }
    setMsg(`Created ${data.coupon.code}`); setF({ code: "", type: "PERCENT", value: "10", minSubtotal: "0", maxUses: "" }); load();
  }
  async function toggle(c: Coupon) { await fetch(`/api/admin/coupons/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !c.active }) }); load(); }
  async function remove(c: Coupon) { await fetch(`/api/admin/coupons/${c.id}`, { method: "DELETE" }); load(); }

  if (loading || !user || user.role !== "ADMIN") return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;

  return (
    <div className="page">
      <AdminNav />
      <h1 style={{ color: "var(--navy)", fontSize: 26, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>Coupons</h1>
      <p style={{ color: "var(--muted)", marginTop: 0, fontFamily: "var(--font-body)" }}>Create promo codes customers enter at checkout.</p>
      {msg && <div className="alert alert-ok" style={{ maxWidth: 760 }}>{msg}</div>}

      <form className="panel" onSubmit={create} style={{ maxWidth: 760 }}>
        <h2>New coupon</h2>
        {err && <div className="alert alert-error">{err}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr", gap: 10 }}>
          <div className="field"><label>Code</label><input value={f.code} onChange={(e) => set("code", e.target.value)} placeholder="USA10" style={{ textTransform: "uppercase" }} /></div>
          <div className="field"><label>Type</label><select value={f.type} onChange={(e) => set("type", e.target.value)}><option value="PERCENT">% off</option><option value="FIXED">$ off</option></select></div>
          <div className="field"><label>{f.type === "PERCENT" ? "Percent" : "Amount ($)"}</label><input type="number" step={f.type === "PERCENT" ? "1" : "0.01"} value={f.value} onChange={(e) => set("value", e.target.value)} /></div>
          <div className="field"><label>Min spend ($)</label><input type="number" step="0.01" value={f.minSubtotal} onChange={(e) => set("minSubtotal", e.target.value)} /></div>
          <div className="field"><label>Max uses</label><input type="number" value={f.maxUses} onChange={(e) => set("maxUses", e.target.value)} placeholder="∞" /></div>
        </div>
        <button className="btn btn-navy">+ Create coupon</button>
      </form>

      <div className="panel">
        <h2>All coupons ({coupons.length})</h2>
        {coupons.length === 0 ? <p style={{ color: "var(--muted)" }}>No coupons yet.</p> :
          coupons.map((c) => (
            <div className="line-item" key={c.id} style={{ borderBottom: "1px solid var(--line)", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <strong style={{ fontFamily: "monospace", fontSize: 15 }}>{c.code}</strong> {c.active ? <span className="badge badge-shipped">Active</span> : <span className="badge badge-pending">Off</span>}
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {c.type === "PERCENT" ? `${c.value}% off` : `${formatPrice(c.value)} off`}
                  {c.minSubtotalCents > 0 ? ` · min ${formatPrice(c.minSubtotalCents)}` : ""}
                  {` · used ${c.usedCount}${c.maxUses != null ? `/${c.maxUses}` : ""}`}
                </div>
              </div>
              <button className="btn btn-outline" style={{ padding: "6px 11px" }} onClick={() => toggle(c)}>{c.active ? "Turn off" : "Turn on"}</button>
              <button className="remove" onClick={() => remove(c)}>Delete</button>
            </div>
          ))}
      </div>
      <p style={{ marginTop: 10, fontSize: 13 }}><Link href="/" className="muted-link">← Back to storefront</Link></p>
    </div>
  );
}
