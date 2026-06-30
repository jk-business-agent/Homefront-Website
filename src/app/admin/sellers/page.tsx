"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AdminNav from "@/components/AdminNav";

type Seller = { id: string; name: string; slug: string; email: string; city: string | null; state: string | null; products: number; approved: boolean; featured: boolean; onboardingComplete: boolean; w9OnFile: boolean };

export default function AdminSellers() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "active">("all");

  const load = useCallback(() => {
    fetch("/api/admin/sellers", { cache: "no-store" }).then((r) => r.json()).then((d) => setSellers(d.sellers || []));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login?next=/admin/sellers"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
    load();
  }, [user, loading, router, load]);

  async function patch(id: string, data: any) {
    await fetch(`/api/admin/sellers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    load();
  }

  if (loading || !user || user.role !== "ADMIN") return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;

  return (
    <div className="page">
      <AdminNav />
      <h1 style={{ color: "var(--navy)", fontSize: 26, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>Sellers</h1>
      <p style={{ color: "var(--muted)", marginTop: 0, fontFamily: "var(--font-body)" }}>Approve, suspend, or feature the makers on your marketplace.</p>

      <div className="tabs">
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All ({sellers.length})</button>
        <button className={filter === "pending" ? "active" : ""} onClick={() => setFilter("pending")}>⏳ Pending review ({sellers.filter((s) => !s.approved).length})</button>
        <button className={filter === "active" ? "active" : ""} onClick={() => setFilter("active")}>Active ({sellers.filter((s) => s.approved).length})</button>
      </div>

      <div className="panel">
        {sellers.filter((s) => filter === "all" || (filter === "pending" ? !s.approved : s.approved)).map((s) => (
          <div className="order-card" key={s.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ flex: 1 }}>
              <strong>{s.name}</strong>{" "}
              {s.approved ? <span className="badge badge-shipped">Active</span> : <span className="badge badge-pending">⏳ Pending / not live</span>}
              {s.featured && <span className="badge badge-paid" style={{ marginLeft: 6 }}>★ Featured</span>}
              {s.w9OnFile ? <span className="badge badge-shipped" style={{ marginLeft: 6 }}>W-9 ✓</span> : <span className="badge badge-pending" style={{ marginLeft: 6 }}>No W-9</span>}
              <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-body)" }}>
                {s.email} · {[s.city, s.state].filter(Boolean).join(", ") || "USA"} · {s.products} products
              </div>
            </div>
            <Link className="btn btn-navy" style={{ padding: "7px 13px" }} href={`/admin/sellers/${s.id}`}>Edit</Link>
            <button className="btn btn-outline" style={{ padding: "7px 13px" }} onClick={() => patch(s.id, { featured: !s.featured })}>{s.featured ? "Unfeature" : "Feature"}</button>
            <button className={`btn ${s.approved ? "btn-outline" : "btn-navy"}`} style={{ padding: "7px 13px" }} onClick={() => patch(s.id, { approved: !s.approved })}>
              {s.approved ? "Suspend" : "Approve"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
