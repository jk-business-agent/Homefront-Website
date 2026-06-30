"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { formatPrice } from "@/lib/format";
import { SMS_CONSENT_TEXT } from "@/lib/sms";

type Addr = { id: string; fullName: string; line1: string; line2?: string | null; city: string; state: string; zip: string; isDefault: boolean };
type ShipOption = { service: string; label: string; etaDays: string; priceCents: number };

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, count, subtotalCents, clear } = useCart();
  const { user, loading: authLoading } = useAuth();

  const [saved, setSaved] = useState<Addr[]>([]);
  const [selectedAddrId, setSelectedAddrId] = useState<string>("");
  const [ship, setShip] = useState({ fullName: "", line1: "", city: "", state: "", zip: "" });

  const [options, setOptions] = useState<ShipOption[]>([]);
  const [service, setService] = useState<string>("");
  const [ratesLoading, setRatesLoading] = useState(false);
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [discountCents, setDiscountCents] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");

  // Optional SMS opt-in
  const [smsPhone, setSmsPhone] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  // Email newsletter opt-in (on by default; one-click unsubscribe in every email)
  const [emailOptIn, setEmailOptIn] = useState(true);
  // Store credit
  const [creditBalance, setCreditBalance] = useState(0);
  const [useCredit, setUseCredit] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch("/api/account/credit", { cache: "no-store" }).then((r) => r.json()).then((d) => setCreditBalance(d.storeCreditCents || 0));
  }, [user]);

  // Load saved addresses and prefill with the default one.
  useEffect(() => {
    if (!user) return;
    fetch("/api/account/addresses", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      const list: Addr[] = d.addresses || [];
      setSaved(list);
      const def = list.find((a) => a.isDefault) || list[0];
      if (def) { applyAddr(def); setSelectedAddrId(def.id); }
      else setShip((s) => ({ ...s, fullName: user.name }));
    });
  }, [user]);

  function applyAddr(a: Addr) {
    setShip({ fullName: a.fullName, line1: a.line1, city: a.city, state: a.state, zip: a.zip });
  }
  function set(k: string, v: string) { setShip((s) => ({ ...s, [k]: v })); setSelectedAddrId(""); }

  // Fetch live shipping options whenever we have a 5-digit ZIP and a cart.
  const fetchRates = useCallback(async (zip: string) => {
    if (zip.replace(/\D/g, "").length < 5 || lines.length === 0) { setOptions([]); return; }
    setRatesLoading(true);
    try {
      const res = await fetch("/api/shipping/quote", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })), zip }),
      });
      const data = await res.json();
      setOptions(data.options || []);
      setService((cur) => cur || data.options?.[0]?.service || "");
    } finally { setRatesLoading(false); }
  }, [lines]);

  useEffect(() => { fetchRates(ship.zip); }, [ship.zip, fetchRates]);

  const chosen = options.find((o) => o.service === service);
  const shippingCents = chosen?.priceCents ?? 0;
  const taxCents = Math.round(subtotalCents * 0.07);
  const beforeCredit = Math.max(0, subtotalCents + shippingCents + taxCents - discountCents);
  const creditApplied = useCredit ? Math.min(creditBalance, beforeCredit) : 0;
  const totalCents = Math.max(0, beforeCredit - creditApplied);

  async function applyCoupon() {
    setCouponMsg("");
    const res = await fetch("/api/coupons/validate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponInput, subtotalCents, items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })) }),
    });
    const data = await res.json();
    if (data.valid) { setAppliedCode(data.code); setDiscountCents(data.discountCents); setCouponMsg(`✅ ${data.code} applied — ${data.label}`); }
    else { setAppliedCode(null); setDiscountCents(0); setCouponMsg(data.error || "Invalid code"); }
  }
  function removeCoupon() { setAppliedCode(null); setDiscountCents(0); setCouponInput(""); setCouponMsg(""); }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!user) { router.push("/login?next=/checkout"); return; }
    if (!chosen) { setError("Enter your ZIP to see shipping options, then pick a speed."); return; }
    setPlacing(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, size: l.size || null })),
          shipping: ship, shippingService: service, couponCode: appliedCode || undefined, useCredit,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not place order"); return; }
      // Optional, consented SMS opt-in — fire-and-forget so it never blocks the order.
      if (smsConsent && smsPhone.trim()) {
        fetch("/api/sms/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: smsPhone, consent: true, source: "checkout" }) }).catch(() => {});
      }
      // Optional email newsletter opt-in (uses the buyer's account email).
      if (emailOptIn && user?.email) {
        fetch("/api/newsletter/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, source: "checkout" }) }).catch(() => {});
      }
      clear();
      router.push(`/account/orders/${data.order.id}`);
      router.refresh();
    } finally { setPlacing(false); }
  }

  if (count === 0) {
    return (
      <div className="page"><div className="empty-state"><div className="b">🛒</div>
        <p style={{ marginTop: 12 }}>Your cart is empty.</p>
        <Link href="/" className="btn btn-navy" style={{ marginTop: 14 }}>Browse products</Link>
      </div></div>
    );
  }

  return (
    <div className="page">
      <h1 style={{ color: "var(--navy)", fontSize: 26, textTransform: "uppercase", letterSpacing: ".4px" }}>Checkout</h1>

      {!authLoading && !user && (
        <div className="alert alert-error" style={{ maxWidth: 920 }}>
          You'll need to <Link href="/login?next=/checkout" className="muted-link">sign in</Link> to place your order. Your cart is saved.
        </div>
      )}

      <div className="checkout-grid" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24, alignItems: "start" }}>
        <form className="panel" onSubmit={placeOrder}>
          <h2>Shipping address</h2>
          <p className="panel-sub">Where should your American-made goods ship?</p>
          {error && <div className="alert alert-error">{error}</div>}

          {saved.length > 0 && (
            <div className="field">
              <label>Use a saved address</label>
              <select value={selectedAddrId} onChange={(e) => { const a = saved.find((x) => x.id === e.target.value); if (a) { applyAddr(a); setSelectedAddrId(a.id); } }}>
                <option value="">— Enter a new address —</option>
                {saved.map((a) => <option key={a.id} value={a.id}>{a.fullName} — {a.line1}, {a.city} {a.state} {a.isDefault ? "(primary)" : ""}</option>)}
              </select>
            </div>
          )}

          <div className="field"><label>Full name</label><input value={ship.fullName} onChange={(e) => set("fullName", e.target.value)} required /></div>
          <div className="field"><label>Street address</label><input value={ship.line1} onChange={(e) => set("line1", e.target.value)} required /></div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
            <div className="field"><label>City</label><input value={ship.city} onChange={(e) => set("city", e.target.value)} required /></div>
            <div className="field"><label>State</label><input value={ship.state} onChange={(e) => set("state", e.target.value)} placeholder="OH" required /></div>
            <div className="field"><label>ZIP</label><input value={ship.zip} onChange={(e) => set("zip", e.target.value)} required /></div>
          </div>

          {/* Shipping speed options */}
          <h2 style={{ marginTop: 8 }}>Shipping speed</h2>
          {ship.zip.replace(/\D/g, "").length < 5 ? (
            <p className="panel-sub">Enter your ZIP code above to see live shipping rates.</p>
          ) : ratesLoading ? (
            <p className="panel-sub">Calculating rates…</p>
          ) : (
            <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
              {options.map((o) => (
                <label key={o.service} className={`ship-opt ${service === o.service ? "sel" : ""}`}>
                  <input type="radio" name="svc" checked={service === o.service} onChange={() => setService(o.service)} />
                  <span style={{ flex: 1 }}>
                    <strong>{o.label}</strong>
                    <span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>{o.etaDays}</span>
                  </span>
                  <span className="cprice">{formatPrice(o.priceCents)}</span>
                </label>
              ))}
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 0" }}>
                Rates estimated by weight &amp; destination. Live carrier rates connect at launch.
              </p>
            </div>
          )}

          {/* Optional email + SMS opt-ins */}
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink)" }}>
            <input type="checkbox" checked={emailOptIn} onChange={(e) => setEmailOptIn(e.target.checked)} />
            📧 Email me deals &amp; new American-made drops <span style={{ color: "var(--muted)", fontSize: 12 }}>(unsubscribe anytime)</span>
          </label>

          <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", marginTop: 8, background: "var(--cream)" }}>
            <div className="field" style={{ marginBottom: 8 }}>
              <label>📱 Get order updates &amp; deals by text (optional)</label>
              <input type="tel" value={smsPhone} onChange={(e) => setSmsPhone(e.target.value)} placeholder="(312) 555-1234" autoComplete="tel" />
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 11.5, lineHeight: 1.4, color: "var(--muted)", fontFamily: "var(--font-body)" }}>
              <input type="checkbox" checked={smsConsent} onChange={(e) => setSmsConsent(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>{SMS_CONSENT_TEXT}</span>
            </label>
          </div>

          <div className="alert alert-ok" style={{ marginTop: 8 }}>
            💳 Payments are simulated for now — placing the order won't charge a card yet.
          </div>
          <button className="btn btn-red btn-block" disabled={placing}>
            {placing ? "Placing order…" : `Place order — ${formatPrice(totalCents)}`}
          </button>
        </form>

        <div className="panel">
          <h2>Order summary</h2>
          <p className="panel-sub">{count} item{count !== 1 ? "s" : ""}</p>
          {lines.map((l) => (
            <div className="line-item" key={l.productId + (l.size || "")}>
              <span className="emoji">{l.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{l.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{l.storeName} · Qty {l.quantity}{l.size ? ` · Size ${l.size}` : ""}</div>
                {l.shipFromState && <div style={{ fontSize: 11, color: "var(--wood)", fontFamily: "var(--font-head)", textTransform: "uppercase", letterSpacing: ".3px" }}>🚚 Ships from {l.shipFromState}</div>}
              </div>
              <span className="cprice">{formatPrice(l.priceCents * l.quantity)}</span>
            </div>
          ))}
          {/* Promo code */}
          <div style={{ borderTop: "1px solid var(--line)", marginTop: 12, paddingTop: 12 }}>
            {appliedCode ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontFamily: "var(--font-body)" }}>
                <span style={{ color: "var(--green)" }}>🏷️ {appliedCode} applied</span>
                <button type="button" className="remove" onClick={removeCoupon}>Remove</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Promo code"
                  style={{ flex: 1, border: "1.5px solid var(--line)", borderRadius: 8, padding: "9px 11px", fontFamily: "var(--font-body)", textTransform: "uppercase" }} />
                <button type="button" className="btn btn-outline" onClick={applyCoupon} style={{ padding: "8px 14px" }}>Apply</button>
              </div>
            )}
            {couponMsg && <div style={{ fontSize: 12, marginTop: 6, color: appliedCode ? "var(--green)" : "var(--barn)", fontFamily: "var(--font-body)" }}>{couponMsg}</div>}
          </div>

          {/* Store credit */}
          {creditBalance > 0 && (
            <div style={{ borderTop: "1px solid var(--line)", marginTop: 12, paddingTop: 12 }}>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontFamily: "var(--font-body)", cursor: "pointer" }}>
                <span><input type="checkbox" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} /> 🎁 Apply store credit ({formatPrice(creditBalance)} available)</span>
              </label>
            </div>
          )}

          <div style={{ borderTop: "1px solid var(--line)", marginTop: 12, paddingTop: 12 }}>
            <div className="row"><span>Subtotal</span><span>{formatPrice(subtotalCents)}</span></div>
            {discountCents > 0 && <div className="row"><span style={{ color: "var(--green)" }}>Discount ({appliedCode})</span><span style={{ color: "var(--green)" }}>−{formatPrice(discountCents)}</span></div>}
            <div className="row"><span>Shipping{chosen ? ` (${chosen.label})` : ""}</span><span>{chosen ? formatPrice(shippingCents) : "—"}</span></div>
            <div className="row"><span>Est. tax</span><span>{formatPrice(taxCents)}</span></div>
            {creditApplied > 0 && <div className="row"><span style={{ color: "var(--green)" }}>🎁 Store credit</span><span style={{ color: "var(--green)" }}>−{formatPrice(creditApplied)}</span></div>}
            <div className="row total"><span>Total</span><span>{formatPrice(totalCents)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
