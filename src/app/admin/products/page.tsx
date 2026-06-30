"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AdminNav from "@/components/AdminNav";
import { formatPrice } from "@/lib/format";

type P = { id: string; name: string; slug: string; emoji: string; priceCents: number; category: string; storeName: string; active: boolean; featuredHome: boolean; featuredCategory: boolean; featuredNewsletter: boolean };

export default function AdminProducts() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [products, setProducts] = useState<P[]>([]);
  const [search, setSearch] = useState("");

  const load = useCallback((q = "") => {
    fetch(`/api/admin/products${q ? `?search=${encodeURIComponent(q)}` : ""}`, { cache: "no-store" }).then((r) => r.json()).then((d) => setProducts(d.products || []));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login?next=/admin/products"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
    load();
  }, [user, loading, router, load]);

  async function patch(id: string, data: any) {
    await fetch(`/api/admin/products/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    load(search);
  }

  if (loading || !user || user.role !== "ADMIN") return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;

  const star = (on: boolean) => ({ padding: "5px 9px", fontSize: 12, ...(on ? {} : { opacity: 0.65 }) });

  return (
    <div className="page">
      <AdminNav />
      <h1 style={{ color: "var(--navy)", fontSize: 26, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>Products</h1>
      <p style={{ color: "var(--muted)", marginTop: 0, fontFamily: "var(--font-body)" }}>Curate what's featured: toggle ★ Home / Category / Newsletter right here, or hide listings across the marketplace.</p>

      <div className="panel">
        <form onSubmit={(e) => { e.preventDefault(); load(search); }} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input className="news-form" style={{ flex: 1, border: "1.5px solid var(--line)", borderRadius: 8, padding: "10px 13px", fontFamily: "var(--font-body)" }} placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn btn-navy">Search</button>
        </form>
        {products.map((p) => (
          <div className="line-item" key={p.id} style={{ borderBottom: "1px solid var(--line)", gap: 12 }}>
            <span className="emoji">{p.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {p.name}{" "}
                {!p.active && <span className="badge badge-pending">Hidden</span>}
                {p.featuredHome && <span className="badge badge-paid" style={{ marginLeft: 6 }}>★ Home</span>}
                {p.featuredCategory && <span className="badge badge-paid" style={{ marginLeft: 6 }}>★ Category</span>}
                {p.featuredNewsletter && <span className="badge badge-paid" style={{ marginLeft: 6 }}>★ Newsletter</span>}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.storeName} · {p.category} · {formatPrice(p.priceCents)}</div>
            </div>
            <button className={`btn ${p.featuredHome ? "btn-gold" : "btn-outline"}`} style={star(p.featuredHome)} title="Feature on homepage" onClick={() => patch(p.id, { featuredHome: !p.featuredHome })}>★ Home</button>
            <button className={`btn ${p.featuredCategory ? "btn-gold" : "btn-outline"}`} style={star(p.featuredCategory)} title="Feature in its category" onClick={() => patch(p.id, { featuredCategory: !p.featuredCategory })}>★ Cat</button>
            <button className={`btn ${p.featuredNewsletter ? "btn-gold" : "btn-outline"}`} style={star(p.featuredNewsletter)} title="Feature on newsletter page" onClick={() => patch(p.id, { featuredNewsletter: !p.featuredNewsletter })}>★ News</button>
            <Link className="btn btn-navy" style={{ padding: "6px 11px" }} href={`/admin/products/${p.id}`}>Edit</Link>
            <button className={`btn ${p.active ? "btn-outline" : "btn-navy"}`} style={{ padding: "6px 11px" }} onClick={() => patch(p.id, { active: !p.active })}>{p.active ? "Hide" : "Show"}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
