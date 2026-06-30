"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AdminNav from "@/components/AdminNav";
import { formatPrice } from "@/lib/format";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login?next=/admin"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
    fetch("/api/admin/stats", { cache: "no-store" }).then((r) => r.json()).then(setStats);
  }, [user, loading, router]);

  if (loading || !user || user.role !== "ADMIN") {
    return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;
  }

  return (
    <div className="page">
      <AdminNav />
      <h1 style={{ color: "var(--navy)", fontSize: 26, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>Platform Dashboard</h1>
      <p style={{ color: "var(--muted)", marginTop: 0, fontFamily: "var(--font-body)" }}>How Homefront Markets is doing overall.</p>

      {!stats ? (
        <p style={{ color: "var(--muted)" }}>Loading numbers…</p>
      ) : (
        <>
          <div className="panel">
            <div className="stat-row">
              <div className="stat"><div className="n">{formatPrice(stats.revenueCents)}</div><div className="l">Total revenue</div></div>
              <div className="stat"><div className="n">{stats.orderCount}</div><div className="l">Orders ({stats.ordersThisWeek} this week)</div></div>
              <div className="stat"><div className="n">{stats.sellerCount}</div><div className="l">Sellers</div></div>
              <div className="stat"><div className="n">{stats.buyerCount}</div><div className="l">Customers</div></div>
            </div>
            <div className="stat-row" style={{ marginTop: 18 }}>
              <div className="stat"><div className="n">{stats.productCount}</div><div className="l">Products</div></div>
              <div className="stat"><div className="n">{stats.subscriberCount}</div><div className="l">Newsletter subscribers</div></div>
              <div className="stat"><div className="n">{stats.newUsersThisWeek}</div><div className="l">New signups (7 days)</div></div>
            </div>
          </div>

          {/* Revenue trend (14 days) */}
          <div className="panel">
            <h2>Revenue — last 14 days</h2>
            {(() => {
              const max = Math.max(1, ...stats.days.map((d: any) => d.revenueCents));
              return (
                <>
                  <div className="bars">
                    {stats.days.map((d: any) => (
                      <div className="bar-col" key={d.day} title={`${d.label}: ${formatPrice(d.revenueCents)} · ${d.orders} orders`}>
                        <div className="bar-stack"><div className="bar orders" style={{ height: `${(d.revenueCents / max) * 100}%` }} /></div>
                        <span className="bar-label">{d.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="legend"><span><span className="dot" style={{ background: "var(--barn)" }} /> Daily revenue</span></div>
                </>
              );
            })()}
          </div>

          {/* Category breakdown + top sellers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="admin-cols">
            <div className="panel">
              <h2>Sales by category</h2>
              {stats.salesByCategory.length === 0 ? <p style={{ color: "var(--muted)" }}>No sales yet.</p> :
                (() => {
                  const max = Math.max(1, ...stats.salesByCategory.map((c: any) => c.revenueCents));
                  return stats.salesByCategory.map((c: any) => (
                    <div key={c.category} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontFamily: "var(--font-body)" }}>
                        <span>{c.category} <span style={{ color: "var(--muted)" }}>({c.units})</span></span>
                        <strong>{formatPrice(c.revenueCents)}</strong>
                      </div>
                      <div className="ms-bar"><span style={{ width: `${(c.revenueCents / max) * 100}%`, background: "var(--pine)" }} /></div>
                    </div>
                  ));
                })()}
            </div>
            <div className="panel">
              <h2>Top sellers</h2>
              {stats.topSellers.length === 0 ? <p style={{ color: "var(--muted)" }}>No sales yet.</p> :
                stats.topSellers.map((s: any, i: number) => (
                  <div className="line-item" key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div><div style={{ fontSize: 12, color: "var(--muted)" }}>{s.units} units</div></div>
                    <span className="cprice">{formatPrice(s.revenueCents)}</span>
                  </div>
                ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="admin-cols">
            <div className="panel">
              <h2>Top products</h2>
              {stats.topProducts.length === 0 ? <p style={{ color: "var(--muted)" }}>No sales yet.</p> :
                stats.topProducts.map((p: any, i: number) => (
                  <div className="line-item" key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                    <span className="emoji">{p.emoji}</span>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: 12, color: "var(--muted)" }}>{p.units} sold</div></div>
                    <span className="cprice">{formatPrice(p.revenueCents)}</span>
                  </div>
                ))}
            </div>
            <div className="panel">
              <h2>Recent orders</h2>
              {stats.recentOrders.length === 0 ? <p style={{ color: "var(--muted)" }}>No orders yet.</p> :
                stats.recentOrders.map((o: any) => (
                  <div className="line-item" key={o.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>#{o.id.slice(-6).toUpperCase()} · {o.buyer}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(o.createdAt).toLocaleDateString()} · {o.status}</div>
                    </div>
                    <span className="cprice">{formatPrice(o.totalCents)}</span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
      <p style={{ marginTop: 10, fontSize: 13 }}><Link href="/" className="muted-link">← Back to storefront</Link></p>
    </div>
  );
}
