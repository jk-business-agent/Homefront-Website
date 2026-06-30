"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AdminNav from "@/components/AdminNav";
import { formatPrice } from "@/lib/format";

const EXPORTS = [
  { type: "orders", label: "All orders", icon: "🧾", desc: "Every order with totals, discounts, and status." },
  { type: "sellers", label: "Sellers & W-9 status", icon: "🏭", desc: "Stores, approval, and whether a W-9 is on file." },
  { type: "products", label: "All products", icon: "🏷️", desc: "Catalog with store, price, stock, and origin." },
  { type: "subscribers", label: "Newsletter subscribers", icon: "📧", desc: "Email list with source and join date." },
];

export default function AdminReports() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login?next=/admin/reports"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
    fetch("/api/admin/stats", { cache: "no-store" }).then((r) => r.json()).then(setStats);
  }, [user, loading, router]);

  if (loading || !user || user.role !== "ADMIN") return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;

  return (
    <div className="page">
      <AdminNav />
      <h1 style={{ color: "var(--navy)", fontSize: 26, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>Reports &amp; Exports</h1>
      <p style={{ color: "var(--muted)", marginTop: 0, fontFamily: "var(--font-body)" }}>Download your data as spreadsheets (CSV) for accounting, taxes, or analysis.</p>

      {stats && (
        <div className="panel">
          <div className="stat-row">
            <div className="stat"><div className="n">{formatPrice(stats.revenueCents)}</div><div className="l">All-time revenue</div></div>
            <div className="stat"><div className="n">{stats.orderCount}</div><div className="l">Orders</div></div>
            <div className="stat"><div className="n">{stats.sellerCount}</div><div className="l">Sellers</div></div>
            <div className="stat"><div className="n">{stats.subscriberCount}</div><div className="l">Subscribers</div></div>
          </div>
        </div>
      )}

      <div className="panel">
        <h2>Downloads</h2>
        {EXPORTS.map((e) => (
          <div className="line-item" key={e.type} style={{ borderBottom: "1px solid var(--line)", gap: 12 }}>
            <span className="emoji">{e.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{e.label}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{e.desc}</div>
            </div>
            <a className="btn btn-navy" style={{ padding: "7px 14px" }} href={`/api/admin/export?type=${e.type}`}>⬇️ CSV</a>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 10, fontSize: 13 }}><Link href="/" className="muted-link">← Back to storefront</Link></p>
    </div>
  );
}
