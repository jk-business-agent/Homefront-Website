"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { formatPrice, stars } from "@/lib/format";
import { CATEGORIES } from "@/lib/categories";
import MessagesPanel from "@/components/MessagesPanel";
import TabMenu from "@/components/TabMenu";
import { parseCsv } from "@/lib/csv";

const SELLER_TAB_GROUPS = [
  { label: "📦 Orders & Customers", items: [
    { key: "orders", label: "📦 Orders" },
    { key: "messages", label: "💬 Messages" },
    { key: "reviews", label: "⭐ Reviews" },
  ] },
  { label: "📊 Performance", items: [
    { key: "overview", label: "📊 Overview" },
    { key: "sales", label: "📈 Sales" },
    { key: "promotions", label: "🎟️ Promotions" },
    { key: "growth", label: "🚀 Growth" },
  ] },
  { label: "🏷️ Products", key: "products" },
  { label: "🏪 Business", key: "business" },
];

const CARRIERS = ["USPS", "UPS", "FedEx", "DHL", "Other"];

type ShipTo = { name: string; line1: string; city: string; state: string; zip: string };
type Item = { itemId: string; product: string; emoji: string; quantity: number; size?: string | null; unitPriceCents: number; fulfillmentStatus: string; trackingCarrier?: string | null; trackingNumber?: string | null; labelUrl?: string | null };
type OrderToFulfill = { orderId: string; placedAt: string; status: string; shipTo: ShipTo; items: Item[] };
type Product = { id: string; name: string; priceCents: number; category: string; emoji: string; madeInState: string | null; stockQty: number; description?: string; sizes?: string | null; active?: boolean; variants?: { size: string; stockQty: number }[] };

type Tab = "overview" | "orders" | "messages" | "growth" | "sales" | "promotions" | "reviews" | "products" | "import" | "business";

export default function SellerDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [storeName, setStoreName] = useState("");
  const [orders, setOrders] = useState<OrderToFulfill[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("orders");
  const [onboarded, setOnboarded] = useState(true);
  const [approved, setApproved] = useState(true);

  const load = useCallback(async () => {
    const [oRes, pRes, sRes] = await Promise.all([
      fetch("/api/seller/orders", { cache: "no-store" }),
      fetch("/api/seller/products", { cache: "no-store" }),
      fetch("/api/seller/store", { cache: "no-store" }),
    ]);
    const oData = await oRes.json();
    const pData = await pRes.json();
    const sData = await sRes.json();
    setStoreName(oData.store?.name || pData.store?.name || "Your store");
    setOrders(oData.ordersToFulfill || []);
    setProducts(pData.products || []);
    setOnboarded(sData.store?.onboardingComplete ?? true);
    setApproved(sData.store?.approved ?? true);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login?next=/seller"); return; }
    if (user.role !== "SELLER") { router.push("/account"); return; }
    load();
  }, [user, authLoading, router, load]);

  if (authLoading || loading) {
    return <div className="page"><p style={{ color: "var(--muted)" }}>Loading dashboard…</p></div>;
  }

  const pendingItems = orders.reduce((n, o) => n + o.items.filter((i) => i.fulfillmentStatus === "PENDING").length, 0);
  const lowStock = products.filter((p) => p.stockQty <= 5);

  return (
    <div className="page">
      <h1 style={{ color: "var(--navy)", fontSize: 27, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 2 }}>{storeName}</h1>
      <p style={{ color: "var(--muted)", marginTop: 0, fontFamily: "var(--font-body)" }}>Seller Center</p>

      {!approved && (
        <div className="alert" style={{ background: "#f6e7cf", border: "1px solid #e2c489", color: "#8a5a18" }}>
          ⏳ <strong>Your store is under review.</strong> Your products won't appear to shoppers until an admin approves your store. We'll email you when you're live.
        </div>
      )}
      {!onboarded && (
        <div className="alert alert-error" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span>⚠️ Finish your seller setup — we need your W-9 / business info before payouts.</span>
          <Link href="/seller/onboarding" className="btn btn-navy" style={{ padding: "8px 16px" }}>Complete setup</Link>
        </div>
      )}
      {lowStock.length > 0 && (
        <div className="alert" style={{ background: "#f6e7cf", border: "1px solid #e2c489", color: "#8a5a18" }}>
          🔔 <strong>{lowStock.length} product{lowStock.length !== 1 ? "s" : ""} low on stock:</strong> {lowStock.map((p) => `${p.name} (${p.stockQty})`).join(", ")} — restock in the Products tab.
        </div>
      )}

      <div className="panel">
        <div className="stat-row">
          <div className="stat"><div className="n">{pendingItems}</div><div className="l">Items to ship</div></div>
          <div className="stat"><div className="n">{orders.length}</div><div className="l">Total orders</div></div>
          <div className="stat"><div className="n">{products.length}</div><div className="l">Products listed</div></div>
        </div>
      </div>

      <TabMenu groups={SELLER_TAB_GROUPS} active={tab} onSelect={(k) => setTab(k as Tab)} large />

      {tab === "overview" && <OverviewTab />}
      {tab === "orders" && <OrdersTab orders={orders} onChange={load} />}
      {tab === "messages" && <MessagesPanel as="seller" />}
      {tab === "growth" && <GrowthTab />}
      {tab === "sales" && <SalesTab />}
      {tab === "promotions" && <PromotionsTab />}
      {tab === "reviews" && <ReviewsTab />}
      {tab === "products" && <ProductsTab products={products} onAdded={load} />}
      {tab === "business" && <BusinessTab />}

      <p style={{ marginTop: 10, fontSize: 13 }}>
        <Link href="/" className="muted-link">← Back to storefront</Link>
      </p>
    </div>
  );
}

/* ---------------- Orders + tracking (3 stages) ---------------- */
function OrdersTab({ orders, onChange }: { orders: OrderToFulfill[]; onChange: () => void }) {
  const [sub, setSub] = useState<"fulfill" | "transit" | "delivered">("fulfill");

  const has = (o: OrderToFulfill, status: string) => o.items.some((i) => i.fulfillmentStatus === status);
  const fulfill = orders.filter((o) => has(o, "PENDING"));
  const transit = orders.filter((o) => has(o, "SHIPPED"));
  const delivered = orders.filter((o) => o.items.every((i) => i.fulfillmentStatus === "DELIVERED"));
  const shown = sub === "fulfill" ? fulfill : sub === "transit" ? transit : delivered;

  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0 }}>Orders</h2>
        <a className="btn btn-outline" style={{ padding: "8px 14px" }} href="/api/seller/orders/export">⬇️ Export CSV</a>
      </div>
      <p className="panel-sub">Track every order from new → in transit → delivered.</p>
      <div className="tabs" style={{ borderBottom: "1px solid var(--line)" }}>
        <button className={sub === "fulfill" ? "active" : ""} onClick={() => setSub("fulfill")}>🆕 Need to fulfill ({fulfill.length})</button>
        <button className={sub === "transit" ? "active" : ""} onClick={() => setSub("transit")}>🚚 In transit ({transit.length})</button>
        <button className={sub === "delivered" ? "active" : ""} onClick={() => setSub("delivered")}>✅ Delivered ({delivered.length})</button>
      </div>

      {shown.length === 0 ? (
        <div className="empty-state"><div className="b">📭</div><p style={{ marginTop: 12 }}>Nothing here yet.</p></div>
      ) : (
        shown.map((o) => (
          <div className="order-card" key={o.orderId}>
            <div className="oc-head">
              <div>
                <strong>Order #{o.orderId.slice(-6).toUpperCase()}</strong>{" "}
                <span className={`badge ${o.status === "DELIVERED" ? "badge-shipped" : o.status === "SHIPPED" ? "badge-paid" : "badge-paid"}`}>{o.status}</span>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>Placed {new Date(o.placedAt).toLocaleString()}</div>
              </div>
              <a className="btn btn-outline" style={{ padding: "6px 12px" }} href={`/seller/packing-slip/${o.orderId}`} target="_blank">🧾 Packing slip</a>
            </div>
            <div className="ship-to"><strong>📮 Ship to:</strong> {o.shipTo.name}, {o.shipTo.line1}, {o.shipTo.city}, {o.shipTo.state} {o.shipTo.zip}</div>
            {o.items.map((it) => <ShipRow key={it.itemId} item={it} onChange={onChange} />)}
          </div>
        ))
      )}
    </div>
  );
}

function ShipRow({ item, onChange }: { item: Item; onChange: () => void }) {
  const [service, setService] = useState("usps_ground");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function buyLabel() {
    setBusy(true); setError("");
    const res = await fetch(`/api/seller/orders/${item.itemId}/label`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Could not create label"); setBusy(false); return; }
    if (data.labelUrl) window.open(data.labelUrl, "_blank");
    onChange();
  }
  async function deliver() {
    setBusy(true);
    await fetch(`/api/seller/orders/${item.itemId}/deliver`, { method: "POST" });
    onChange();
  }

  return (
    <div style={{ borderTop: "1px solid var(--line)", padding: "10px 0" }}>
      <div className="line-item" style={{ padding: 0 }}>
        <span className="emoji">{item.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{item.product}{item.size ? <span style={{ color: "var(--barn)" }}> · Size {item.size}</span> : ""}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Qty {item.quantity} · {formatPrice(item.unitPriceCents)} each</div>
        </div>
        {item.fulfillmentStatus === "DELIVERED" && <span className="badge badge-shipped">✓ Delivered</span>}
      </div>
      {error && <div className="alert alert-error" style={{ marginTop: 8 }}>{error}</div>}

      {item.fulfillmentStatus === "PENDING" && (
        <div className="track-input">
          <select value={service} onChange={(e) => setService(e.target.value)}>
            <option value="usps_ground">USPS Ground</option>
            <option value="usps_priority">USPS Priority</option>
            <option value="ups_2day">UPS 2-Day</option>
            <option value="overnight">Overnight</option>
          </select>
          <button className="btn btn-navy" style={{ padding: "8px 16px" }} disabled={busy} onClick={buyLabel}>
            {busy ? "Creating…" : "🏷️ Buy & Print Label"}
          </button>
        </div>
      )}
      {item.fulfillmentStatus === "SHIPPED" && (
        <div className="track-input">
          {item.trackingNumber && <span className="tracking-pill">🚚 {item.trackingCarrier}: {item.trackingNumber}</span>}
          {item.labelUrl && <a className="btn btn-outline" style={{ padding: "8px 16px" }} href={item.labelUrl} target="_blank" rel="noreferrer">🖨️ Print label</a>}
          <button className="btn btn-outline" style={{ padding: "8px 16px" }} disabled={busy} onClick={deliver}>Mark delivered</button>
        </div>
      )}
      {item.fulfillmentStatus === "DELIVERED" && item.trackingNumber && (
        <div style={{ marginTop: 6 }}><span className="tracking-pill">🚚 {item.trackingCarrier}: {item.trackingNumber}</span></div>
      )}
    </div>
  );
}

/* ---------------- Daily overview ---------------- */
function OverviewTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch("/api/seller/overview", { cache: "no-store" }).then((r) => r.json()).then(setData); }, []);
  if (!data) return <div className="panel"><p style={{ color: "var(--muted)" }}>Loading overview…</p></div>;
  const maxVal = Math.max(1, ...data.days.map((d: any) => d.views + d.orders));
  return (
    <div className="panel">
      <h2>Daily Overview</h2>
      <p className="panel-sub">Views and orders, last 7 days.</p>
      <div className="stat-row" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="n">{data.viewsTotal}</div><div className="l">Views this week</div></div>
        <div className="stat"><div className="n">{data.ordersThisWeek}</div><div className="l">Items ordered this week</div></div>
        <div className="stat"><div className="n">{data.totalUnits}</div><div className="l">Lifetime units sold</div></div>
      </div>
      <div className="bars">
        {data.days.map((d: any) => (
          <div className="bar-col" key={d.day} title={`${d.views} views · ${d.orders} orders`}>
            <div className="bar-stack">
              {d.orders > 0 && <div className="bar orders" style={{ height: `${(d.orders / maxVal) * 100}%` }} />}
              <div className="bar views" style={{ height: `${(d.views / maxVal) * 100}%` }} />
            </div>
            <span className="bar-label">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="legend">
        <span><span className="dot" style={{ background: "var(--slate)" }} /> Views</span>
        <span><span className="dot" style={{ background: "var(--barn)" }} /> Orders</span>
      </div>
      {data.nextMilestone && (
        <div style={{ marginTop: 18 }}>
          <p style={{ fontFamily: "var(--font-body)", color: "var(--muted)", margin: "0 0 8px" }}>
            🚀 Next goal: <strong>{data.nextMilestone.title}</strong> → {data.nextMilestone.reward}
          </p>
          <div className="ms-bar"><span style={{ width: `${Math.round(data.nextMilestone.progress * 100)}%` }} /></div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Growth opportunities ---------------- */
function GrowthTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch("/api/seller/overview", { cache: "no-store" }).then((r) => r.json()).then(setData); }, []);
  if (!data) return <div className="panel"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;
  return (
    <div className="panel">
      <h2>Growth Opportunities</h2>
      <p className="panel-sub">Hit these milestones to unlock rewards and promotion across Homefront Markets.</p>
      {data.featured && (
        <div className="alert alert-ok">⭐ You're eligible to be featured on the homepage — nice work!</div>
      )}
      {data.milestones.map((m: any) => (
        <div className={`milestone ${m.achieved ? "done" : ""}`} key={m.units}>
          <span className="ms-emoji">{m.emoji}</span>
          <div className="ms-body">
            <div className="ms-title">{m.title}</div>
            <div className="ms-reward">{m.reward}</div>
            <div className="ms-bar"><span style={{ width: `${Math.round(m.progress * 100)}%` }} /></div>
          </div>
          <span className="ms-status" style={{ color: m.achieved ? "var(--green)" : "var(--muted)" }}>
            {m.achieved ? "✓ Unlocked" : `${data.totalUnits}/${m.units}`}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Sales ---------------- */
function SalesTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch("/api/seller/sales", { cache: "no-store" }).then((r) => r.json()).then(setData); }, []);
  if (!data) return <div className="panel"><p style={{ color: "var(--muted)" }}>Loading sales…</p></div>;
  const days = data.days || [];
  const maxRev = Math.max(1, ...days.map((d: any) => d.revenueCents));
  return (
    <div className="panel">
      <h2>Sales Dashboard</h2>
      <p className="panel-sub">How your store is performing.</p>
      <div className="stat-row" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="n">{formatPrice(data.revenueCents || 0)}</div><div className="l">Total revenue</div></div>
        <div className="stat"><div className="n">{data.unitsSold || 0}</div><div className="l">Units sold</div></div>
        <div className="stat"><div className="n">{data.orderCount || 0}</div><div className="l">Orders</div></div>
        <div className="stat"><div className="n">{formatPrice(data.avgOrderCents || 0)}</div><div className="l">Avg. order value</div></div>
      </div>

      {days.length > 0 && (
        <>
          <h3 style={{ color: "var(--navy)", textTransform: "uppercase", letterSpacing: ".3px", fontSize: 16 }}>Revenue — last 14 days</h3>
          {data.revenueCents > 0 ? (
            <div className="bars" style={{ marginBottom: 8 }}>
              {days.map((d: any) => (
                <div className="bar-col" key={d.day} title={`${d.label}: ${formatPrice(d.revenueCents)} · ${d.orders} order${d.orders !== 1 ? "s" : ""}`}>
                  <div className="bar-stack">
                    <div className="bar orders" style={{ height: `${(d.revenueCents / maxRev) * 100}%`, background: "var(--amber)" }} />
                  </div>
                  <span className="bar-label">{d.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--muted)" }}>No revenue in the last 14 days yet.</p>
          )}
        </>
      )}

      <h3 style={{ color: "var(--navy)", textTransform: "uppercase", letterSpacing: ".3px", fontSize: 16, marginTop: 18 }}>Top products</h3>
      {(!data.topProducts || data.topProducts.length === 0) ? (
        <p style={{ color: "var(--muted)" }}>No sales yet.</p>
      ) : (
        data.topProducts.map((p: any, i: number) => (
          <div className="line-item" key={i} style={{ borderBottom: "1px solid var(--line)" }}>
            <span className="emoji">{p.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.units} sold</div>
            </div>
            <span className="cprice">{formatPrice(p.revenueCents)}</span>
          </div>
        ))
      )}
    </div>
  );
}

/* ---------------- Promotions (seller coupons) ---------------- */
function PromotionsTab() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [f, setF] = useState({ code: "", type: "PERCENT", value: "", minSubtotalDollars: "", maxUses: "" });
  const [err, setErr] = useState(""); const [ok, setOk] = useState(""); const [saving, setSaving] = useState(false);

  const load = useCallback(() => { fetch("/api/seller/coupons", { cache: "no-store" }).then((r) => r.json()).then((d) => setCoupons(d.coupons || [])); }, []);
  useEffect(() => { load(); }, [load]);
  function set(k: string, v: string) { setF((x) => ({ ...x, [k]: v })); }

  async function create(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setOk(""); setSaving(true);
    const body: any = {
      code: f.code, type: f.type, value: parseFloat(f.value || "0"),
      minSubtotalDollars: parseFloat(f.minSubtotalDollars || "0") || 0,
      maxUses: f.maxUses ? parseInt(f.maxUses, 10) : null,
    };
    const res = await fetch("/api/seller/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json(); setSaving(false);
    if (!res.ok) { setErr(data.error || "Could not create"); return; }
    setOk(`Created ${data.coupon.code}`); setF({ code: "", type: "PERCENT", value: "", minSubtotalDollars: "", maxUses: "" }); load();
  }
  async function toggle(c: any) { await fetch(`/api/seller/coupons/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !c.active }) }); load(); }
  async function remove(c: any) { if (!confirm(`Delete code ${c.code}?`)) return; await fetch(`/api/seller/coupons/${c.id}`, { method: "DELETE" }); load(); }

  const fmtVal = (c: any) => (c.type === "PERCENT" ? `${c.value}% off` : `${formatPrice(c.value)} off`);

  return (
    <>
      <form className="panel" onSubmit={create}>
        <h2>Create a promo code</h2>
        <p className="panel-sub">Your codes only discount <strong>your</strong> products in a shopper's cart.</p>
        {err && <div className="alert alert-error">{err}</div>}
        {ok && <div className="alert alert-ok">{ok}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr", gap: 10 }}>
          <div className="field"><label>Code</label><input value={f.code} onChange={(e) => set("code", e.target.value)} placeholder="SUMMER10" required style={{ textTransform: "uppercase" }} /></div>
          <div className="field"><label>Type</label><select value={f.type} onChange={(e) => set("type", e.target.value)}><option value="PERCENT">% off</option><option value="FIXED">$ off</option></select></div>
          <div className="field"><label>{f.type === "PERCENT" ? "Percent" : "Amount ($)"}</label><input type="number" step={f.type === "PERCENT" ? "1" : "0.01"} min="0" value={f.value} onChange={(e) => set("value", e.target.value)} required /></div>
          <div className="field"><label>Min spend ($)</label><input type="number" step="0.01" min="0" value={f.minSubtotalDollars} onChange={(e) => set("minSubtotalDollars", e.target.value)} placeholder="0" /></div>
          <div className="field"><label>Max uses</label><input type="number" min="1" value={f.maxUses} onChange={(e) => set("maxUses", e.target.value)} placeholder="∞" /></div>
        </div>
        <button className="btn btn-navy" disabled={saving}>{saving ? "Creating…" : "Create code"}</button>
      </form>

      <div className="panel">
        <h2>Your promo codes</h2>
        {coupons.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No codes yet — create one above.</p>
        ) : coupons.map((c) => (
          <div className="line-item" key={c.id} style={{ borderBottom: "1px solid var(--line)" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-head)", letterSpacing: ".5px" }}>
                {c.code} {c.active ? <span className="badge badge-shipped">Active</span> : <span className="badge badge-pending">Off</span>}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {fmtVal(c)}{c.minSubtotalCents > 0 ? ` · min ${formatPrice(c.minSubtotalCents)}` : ""}{c.maxUses ? ` · ${c.usedCount}/${c.maxUses} used` : ` · ${c.usedCount} used`}
              </div>
            </div>
            <button className="btn btn-outline" style={{ padding: "6px 11px" }} onClick={() => toggle(c)}>{c.active ? "Turn off" : "Turn on"}</button>
            <button className="remove" onClick={() => remove(c)}>Delete</button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------------- Reviews ---------------- */
function ReviewsTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch("/api/seller/reviews", { cache: "no-store" }).then((r) => r.json()).then(setData); }, []);
  if (!data) return <div className="panel"><p style={{ color: "var(--muted)" }}>Loading reviews…</p></div>;
  return (
    <div className="panel">
      <h2>Product Reviews</h2>
      <p className="panel-sub">What customers are saying about your products.</p>
      {data.count > 0 && (
        <div className="review-summary"><span className="big">{data.averageRating.toFixed(1)}</span>
          <div><div className="stars" style={{ fontSize: 18 }}>{stars(data.averageRating)}</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{data.count} review{data.count !== 1 ? "s" : ""}</div></div>
        </div>
      )}
      {(!data.reviews || data.reviews.length === 0) ? (
        <p style={{ color: "var(--muted)" }}>No reviews yet.</p>
      ) : (
        data.reviews.map((r: any) => (
          <div className="review" key={r.id}>
            <div className="r-head">
              <span className="r-author">{r.authorName} · <span style={{ color: "var(--barn)" }}>{r.product.emoji} {r.product.name}</span></span>
              <span className="r-date">{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="stars">{stars(r.rating)}</div>
            {r.title && <div className="r-title">{r.title}</div>}
            <div className="r-body">{r.body}</div>
          </div>
        ))
      )}
    </div>
  );
}

/* ---------------- Products + rich add form ---------------- */
function ProductsTab({ products, onAdded }: { products: Product[]; onAdded: () => void }) {
  const [cats, setCats] = useState<string[]>(CATEGORIES);
  useEffect(() => { fetch("/api/categories").then((r) => r.json()).then((d) => { if (d.categories?.length) setCats(d.categories.map((c: any) => c.name)); }).catch(() => {}); }, []);
  const [bulk, setBulk] = useState(false);
  const [importing, setImporting] = useState(false);
  return (
    <>
      {/* Blue bar: switch between managing products and bulk CSV import */}
      <div className="seller-action-bar">
        <span>{importing ? "⬆️ Import products from a spreadsheet" : "🏷️ Manage your product catalog"}</span>
        <button onClick={() => setImporting((v) => !v)}>
          {importing ? "← Back to products" : "⬆️ Import products (CSV)"}
        </button>
      </div>

      {importing ? (
        <ImportTab onImported={onAdded} />
      ) : (
        <>
          <AddProductForm onAdded={onAdded} />
          <div className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <h2 style={{ margin: 0 }}>Your Products</h2>
                <p className="panel-sub" style={{ margin: "2px 0 0" }}>Edit details or restock quantity anytime.</p>
              </div>
              {products.length > 0 && (
                <button className={`btn ${bulk ? "btn-navy" : "btn-outline"}`} style={{ padding: "8px 14px" }} onClick={() => setBulk((b) => !b)}>
                  {bulk ? "Done bulk editing" : "⚡ Bulk edit prices & stock"}
                </button>
              )}
            </div>
            {products.length === 0 ? (
              <div className="empty-state"><div className="b">🏷️</div><p style={{ marginTop: 12 }}>No products yet — add your first above.</p></div>
            ) : bulk ? (
              <BulkEditPanel products={products} onSaved={onAdded} />
            ) : (
              products.map((p) => <SellerProductRow key={p.id} product={p} cats={cats} onChange={onAdded} />)
            )}
          </div>
        </>
      )}
    </>
  );
}

/* ---------------- Bulk price/stock editor ---------------- */
function BulkEditPanel({ products, onSaved }: { products: Product[]; onSaved: () => void }) {
  const hasVariants = (p: Product) => (p.variants && p.variants.length > 0) || !!(p.sizes && p.sizes.trim());
  const [rows, setRows] = useState<Record<string, { price: string; stock: string }>>(
    Object.fromEntries(products.map((p) => [p.id, { price: (p.priceCents / 100).toFixed(2), stock: String(p.stockQty) }])),
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function set(id: string, k: "price" | "stock", v: string) {
    setRows((r) => ({ ...r, [id]: { ...r[id], [k]: v } }));
  }

  async function saveAll() {
    setSaving(true); setMsg("");
    const updates = products.map((p) => {
      const r = rows[p.id]; const u: any = { id: p.id };
      const newPrice = Math.round(parseFloat(r.price || "0") * 100);
      if (!Number.isNaN(newPrice) && newPrice !== p.priceCents) u.priceCents = newPrice;
      if (!hasVariants(p)) { const newStock = parseInt(r.stock || "0", 10); if (!Number.isNaN(newStock) && newStock !== p.stockQty) u.stockQty = newStock; }
      return u;
    }).filter((u) => u.priceCents !== undefined || u.stockQty !== undefined);

    if (updates.length === 0) { setMsg("No changes to save."); setSaving(false); return; }
    const res = await fetch("/api/seller/products/bulk", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ updates }) });
    const data = await res.json(); setSaving(false);
    if (!res.ok) { setMsg(data.error || "Could not save"); return; }
    setMsg(`✅ Updated ${data.updated} product${data.updated !== 1 ? "s" : ""}.`); onSaved();
  }

  return (
    <div style={{ marginTop: 12 }}>
      {msg && <div className={msg.startsWith("✅") ? "alert alert-ok" : "alert"} style={{ marginBottom: 10 }}>{msg}</div>}
      <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body)", fontSize: 14 }}>
          <thead><tr style={{ background: "var(--cream)" }}>
            <th style={{ textAlign: "left", padding: "9px 12px" }}>Product</th>
            <th style={{ textAlign: "left", padding: "9px 12px", width: 130 }}>Price (USD)</th>
            <th style={{ textAlign: "left", padding: "9px 12px", width: 140 }}>Stock</th>
          </tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: "7px 12px" }}>{p.emoji} {p.name}</td>
                <td style={{ padding: "7px 12px" }}>
                  <input type="number" step="0.01" min="0" value={rows[p.id]?.price ?? ""} onChange={(e) => set(p.id, "price", e.target.value)} style={{ width: 100, border: "1.5px solid var(--line)", borderRadius: 6, padding: "6px 9px" }} />
                </td>
                <td style={{ padding: "7px 12px" }}>
                  {hasVariants(p) ? (
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>per-size →</span>
                  ) : (
                    <input type="number" min="0" value={rows[p.id]?.stock ?? ""} onChange={(e) => set(p.id, "stock", e.target.value)} style={{ width: 90, border: "1.5px solid var(--line)", borderRadius: 6, padding: "6px 9px" }} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0" }}>Sized products track stock per size — edit those in their individual product editor.</p>
      <button className="btn btn-navy" disabled={saving} onClick={saveAll}>{saving ? "Saving…" : "Save all changes"}</button>
    </div>
  );
}

function SellerProductRow({ product, cats, onChange }: { product: Product; cats: string[]; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({
    name: product.name, price: (product.priceCents / 100).toFixed(2), stockQty: String(product.stockQty),
    category: product.category, sizes: product.sizes || "", description: product.description || "", active: product.active ?? true,
  });
  const [sizeQty, setSizeQty] = useState<Record<string, string>>(Object.fromEntries((product.variants || []).map((v) => [v.size, String(v.stockQty)])));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  function set(k: string, v: any) { setF((x) => ({ ...x, [k]: v })); }
  const sizeArr = (f.sizes || "").split(",").map((s) => s.trim()).filter(Boolean);

  async function save() {
    setSaving(true); setErr("");
    const variants = sizeArr.length ? sizeArr.map((s) => ({ size: s, stockQty: parseInt(sizeQty[s] || "0", 10) })) : undefined;
    const res = await fetch(`/api/seller/products/${product.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.name, priceCents: Math.round(parseFloat(f.price || "0") * 100), stockQty: parseInt(f.stockQty || "0", 10),
        category: f.category, sizes: f.sizes || null, description: f.description, active: f.active, variants,
      }),
    });
    const data = await res.json(); setSaving(false);
    if (!res.ok) { setErr(data.error || "Could not save"); return; }
    setEditing(false); onChange();
  }

  if (!editing) {
    return (
      <div className="line-item" style={{ borderBottom: "1px solid var(--line)" }}>
        <span className="emoji">{product.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{product.name} {product.active === false && <span className="badge badge-pending">Hidden</span>}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{product.category} · {product.madeInState || "USA"} · <strong style={{ color: product.stockQty <= 5 ? "var(--barn)" : "inherit" }}>{product.stockQty} in stock</strong></div>
        </div>
        <span className="cprice">{formatPrice(product.priceCents)}</span>
        <button className="btn btn-outline" style={{ padding: "6px 12px" }} onClick={() => setEditing(true)}>Edit</button>
      </div>
    );
  }

  return (
    <div className="order-card">
      {err && <div className="alert alert-error">{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
        <div className="field"><label>Name</label><input value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
        <div className="field"><label>Price (USD)</label><input type="number" step="0.01" value={f.price} onChange={(e) => set("price", e.target.value)} /></div>
        <div className="field"><label>Stock {sizeArr.length > 0 ? "(total)" : "(restock here)"}</label><input type="number" min="0" value={sizeArr.length > 0 ? String(sizeArr.reduce((n, s) => n + (parseInt(sizeQty[s] || "0", 10) || 0), 0)) : f.stockQty} disabled={sizeArr.length > 0} onChange={(e) => set("stockQty", e.target.value)} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="field"><label>Category</label><select value={f.category} onChange={(e) => set("category", e.target.value)}>{cats.map((c) => <option key={c}>{c}</option>)}{!cats.includes(f.category) && <option>{f.category}</option>}</select></div>
        <div className="field"><label>Sizes</label><input value={f.sizes} onChange={(e) => set("sizes", e.target.value)} placeholder="S, M, L, XL" /></div>
      </div>
      {sizeArr.length > 0 && (
        <div className="field">
          <label>Stock per size (restock here)</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {sizeArr.map((s) => (
              <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-head)", fontSize: 12, color: "var(--navy)" }}>{s}</span>
                <input type="number" min="0" value={sizeQty[s] ?? ""} onChange={(e) => setSizeQty((q) => ({ ...q, [s]: e.target.value }))} placeholder="0" style={{ width: 64, textAlign: "center" }} />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="field"><label>Description</label><textarea rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
      <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, fontFamily: "var(--font-body)" }}><input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} /> Visible in store</label>
      <button className="btn btn-navy" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}</button>{" "}
      <button className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
    </div>
  );
}

/* ---------------- Bulk CSV import ---------------- */
function ImportTab({ onImported }: { onImported: () => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ created: number; failed: number; errors: { row: number; error: string }[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [err, setErr] = useState("");

  const rows = (() => { try { return text.trim() ? parseCsv(text) : []; } catch { return []; } })();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setText(await file.text()); setResult(null); e.target.value = "";
  }

  async function doImport() {
    setImporting(true); setErr(""); setResult(null);
    try {
      const res = await fetch("/api/seller/products/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Import failed"); return; }
      setResult(data); onImported();
    } finally { setImporting(false); }
  }

  return (
    <div className="panel">
      <h2>Bulk Import Products</h2>
      <p className="panel-sub">Upload a spreadsheet (CSV) to add many products at once. Start from our template so the columns line up.</p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <a className="btn btn-outline" href="/api/seller/products/template">⬇️ Download template</a>
        <label className="btn btn-navy" style={{ cursor: "pointer" }}>📄 Choose CSV file<input type="file" accept=".csv,text/csv" hidden onChange={onFile} /></label>
      </div>

      <div className="field">
        <label>…or paste your CSV here</label>
        <textarea rows={5} value={text} onChange={(e) => { setText(e.target.value); setResult(null); }} placeholder="name,description,price,category,...&#10;Cast Iron Skillet,...,44.99,Home,..." style={{ fontFamily: "monospace", fontSize: 12 }} />
      </div>

      {err && <div className="alert alert-error">{err}</div>}

      {rows.length > 0 && !result && (
        <>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--muted)" }}>Preview — <strong>{rows.length}</strong> product{rows.length !== 1 ? "s" : ""} ready to import:</p>
          <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 8, marginBottom: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "var(--font-body)" }}>
              <thead><tr style={{ background: "var(--cream)" }}>{["name", "price", "category", "madeInState", "stockQty", "sizes", "sizeStock"].map((h) => <th key={h} style={{ textAlign: "left", padding: "8px 10px" }}>{h}</th>)}</tr></thead>
              <tbody>
                {rows.slice(0, 8).map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--line)" }}>
                    {["name", "price", "category", "madeInState", "stockQty", "sizes", "sizeStock"].map((h) => <td key={h} style={{ padding: "7px 10px" }}>{r[h] || ""}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 8 && <p style={{ fontSize: 12, color: "var(--muted)" }}>…and {rows.length - 8} more.</p>}
          <button className="btn btn-navy" disabled={importing} onClick={doImport}>{importing ? "Importing…" : `Import ${rows.length} product${rows.length !== 1 ? "s" : ""}`}</button>
        </>
      )}

      {result && (
        <div>
          <div className="alert alert-ok">✅ Imported {result.created} product{result.created !== 1 ? "s" : ""}.{result.failed > 0 ? ` ${result.failed} row(s) had problems:` : ""}</div>
          {result.errors.length > 0 && (
            <ul style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--barn)" }}>
              {result.errors.map((e, i) => <li key={i}>Row {e.row}: {e.error}</li>)}
            </ul>
          )}
          <button className="btn btn-outline" onClick={() => { setText(""); setResult(null); }}>Import another file</button>
        </div>
      )}
    </div>
  );
}

function AddProductForm({ onAdded }: { onAdded: () => void }) {
  const empty = { name: "", description: "", price: "", category: CATEGORIES[0], emoji: "📦", madeInCity: "", madeInState: "", stockQty: "100", weightOz: "", shippingPrice: "0", dimensions: "", sizes: "", safetyInfo: "" };
  const [form, setForm] = useState(empty);
  const [cats, setCats] = useState<string[]>(CATEGORIES);
  useEffect(() => { fetch("/api/categories").then((r) => r.json()).then((d) => { if (d.categories?.length) setCats(d.categories.map((c: any) => c.name)); }).catch(() => {}); }, []);
  const [images, setImages] = useState<string[]>([]);
  const [sizeQty, setSizeQty] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);
  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function onImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true); setError("");
    for (const file of files) {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setImages((m) => [...m, data.url]); else setError(data.error || "Upload failed");
    }
    setUploading(false); e.target.value = "";
  }

  const sizeArr = (form.sizes || "").split(",").map((s) => s.trim()).filter(Boolean);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setOk(""); setSaving(true);
    try {
      const variants = sizeArr.length ? sizeArr.map((s) => ({ size: s, stockQty: parseInt(sizeQty[s] || "0", 10) })) : undefined;
      const res = await fetch("/api/seller/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, description: form.description,
          priceCents: Math.round(parseFloat(form.price || "0") * 100),
          category: form.category, emoji: form.emoji || "📦",
          madeInCity: form.madeInCity || undefined, madeInState: form.madeInState,
          stockQty: parseInt(form.stockQty || "100", 10),
          weightOz: form.weightOz ? parseInt(form.weightOz, 10) : null,
          shippingPriceCents: Math.round(parseFloat(form.shippingPrice || "0") * 100),
          dimensions: form.dimensions || undefined,
          sizes: form.sizes || undefined,
          safetyInfo: form.safetyInfo || undefined,
          imageUrls: images,
          variants,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not add product"); return; }
      setOk(`Added “${data.product.name}” — it's now live in the store.`);
      setForm(empty); setImages([]); setSizeQty({}); onAdded();
    } finally { setSaving(false); }
  }

  return (
    <form className="panel" onSubmit={submit}>
      <h2>Add a Product</h2>
      <p className="panel-sub">List a new American-made product. Fields marked * are required.</p>
      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-ok">{ok}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
        <div className="field"><label>Product name *</label><input value={form.name} onChange={(e) => set("name", e.target.value)} required /></div>
        <div className="field"><label>Price (USD) *</label><input type="number" step="0.01" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="49.99" required /></div>
        <div className="field"><label>Quantity in stock</label><input type="number" min="0" value={form.stockQty} onChange={(e) => set("stockQty", e.target.value)} /></div>
      </div>

      <div className="field"><label>Description *</label><textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} required /></div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
        <div className="field"><label>Category *</label><select value={form.category} onChange={(e) => set("category", e.target.value)}>{cats.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="field"><label>Icon (emoji)</label><input value={form.emoji} onChange={(e) => set("emoji", e.target.value)} maxLength={4} /></div>
        <div className="field"><label>Made in (city)</label><input value={form.madeInCity} onChange={(e) => set("madeInCity", e.target.value)} placeholder="Austin" /></div>
        <div className="field"><label>Made in (state) *</label><input value={form.madeInState} onChange={(e) => set("madeInState", e.target.value)} placeholder="Texas" required /></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div className="field"><label>Shipping weight (oz)</label><input type="number" min="0" value={form.weightOz} onChange={(e) => set("weightOz", e.target.value)} placeholder="16" /></div>
        <div className="field"><label>Shipping price (USD)</label><input type="number" step="0.01" min="0" value={form.shippingPrice} onChange={(e) => set("shippingPrice", e.target.value)} placeholder="0 = free" /></div>
        <div className="field"><label>Dimensions</label><input value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} placeholder="12 x 8 x 3 in" /></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field"><label>Sizes (apparel, comma-separated)</label><input value={form.sizes} onChange={(e) => set("sizes", e.target.value)} placeholder="S, M, L, XL" /></div>
        <div className="field"><label>Safety info / restrictions</label><input value={form.safetyInfo} onChange={(e) => set("safetyInfo", e.target.value)} placeholder="e.g. Keep away from open flame" /></div>
      </div>
      {sizeArr.length > 0 && (
        <div className="field">
          <label>Quantity per size</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {sizeArr.map((s) => (
              <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-head)", fontSize: 12, color: "var(--navy)" }}>{s}</span>
                <input type="number" min="0" value={sizeQty[s] ?? ""} onChange={(e) => setSizeQty((q) => ({ ...q, [s]: e.target.value }))} placeholder="0" style={{ width: 64, textAlign: "center" }} />
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 0" }}>Stock is tracked per size — total fills in automatically.</p>
        </div>
      )}

      <div className="field">
        <label>Product photos</label>
        {images.length > 0 && (
          <div className="media-row">{images.map((src, i) => <img key={i} className="m" src={src} alt="" />)}</div>
        )}
        <label className="upload-btn">
          {uploading ? "Uploading…" : "📷 Upload photos"}
          <input type="file" accept="image/*" multiple hidden onChange={onImages} />
        </label>
      </div>

      <button className="btn btn-navy" disabled={saving || uploading}>{saving ? "Adding…" : "Add product"}</button>
    </form>
  );
}

/* ---------------- Business info ---------------- */
function BusinessTab() {
  const [form, setForm] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/seller/store", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      const s = d.store || {};
      setForm({
        name: s.name || "", bio: s.bio || "", story: s.story || "", city: s.city || "", state: s.state || "",
        employees: s.employees ?? "", foundedYear: s.foundedYear ?? "",
        shipFromLine1: s.shipFromLine1 || "", shipFromCity: s.shipFromCity || "", shipFromState: s.shipFromState || "", shipFromZip: s.shipFromZip || "",
      });
    });
  }, []);

  function set(k: string, v: string) { setForm((f: any) => ({ ...f, [k]: v })); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg("");
    const res = await fetch("/api/seller/store", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name, bio: form.bio, story: form.story, city: form.city, state: form.state,
        employees: form.employees === "" ? null : parseInt(form.employees, 10),
        foundedYear: form.foundedYear === "" ? null : parseInt(form.foundedYear, 10),
        shipFromLine1: form.shipFromLine1, shipFromCity: form.shipFromCity, shipFromState: form.shipFromState, shipFromZip: form.shipFromZip,
      }),
    });
    setMsg(res.ok ? "Saved!" : "Could not save");
    setSaving(false);
  }

  if (!form) return <div className="panel"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;

  return (
    <form className="panel" onSubmit={save}>
      <h2>Business Info</h2>
      <p className="panel-sub">This appears on your product pages and the Vendors page — tell your story.</p>
      {msg && <div className="alert alert-ok">{msg}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
        <div className="field"><label>Store name</label><input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
        <div className="field"><label>City</label><input value={form.city} onChange={(e) => set("city", e.target.value)} /></div>
        <div className="field"><label>State</label><input value={form.state} onChange={(e) => set("state", e.target.value)} /></div>
      </div>
      <div className="field"><label>Short tagline</label><input value={form.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Hand-forged cookware from Tennessee" /></div>
      <div className="field"><label>Your story (shown on product pages)</label><textarea rows={4} value={form.story} onChange={(e) => set("story", e.target.value)} placeholder="Tell customers who you are, what you make, and how many people you employ…" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field"><label>U.S. employees</label><input type="number" min="0" value={form.employees} onChange={(e) => set("employees", e.target.value)} /></div>
        <div className="field"><label>Year founded</label><input type="number" value={form.foundedYear} onChange={(e) => set("foundedYear", e.target.value)} placeholder="1998" /></div>
      </div>

      <h3 style={{ color: "var(--navy)", textTransform: "uppercase", letterSpacing: ".3px", fontSize: 15, marginTop: 18 }}>📦 Ship-from address</h3>
      <p className="panel-sub">Where your packages ship from — used to generate shipping labels.</p>
      <div className="field"><label>Street address</label><input value={form.shipFromLine1} onChange={(e) => set("shipFromLine1", e.target.value)} placeholder="123 Workshop Rd" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
        <div className="field"><label>City</label><input value={form.shipFromCity} onChange={(e) => set("shipFromCity", e.target.value)} /></div>
        <div className="field"><label>State</label><input value={form.shipFromState} onChange={(e) => set("shipFromState", e.target.value)} placeholder="TN" /></div>
        <div className="field"><label>ZIP</label><input value={form.shipFromZip} onChange={(e) => set("shipFromZip", e.target.value)} /></div>
      </div>

      <button className="btn btn-navy" disabled={saving}>{saving ? "Saving…" : "Save business info"}</button>
    </form>
  );
}
