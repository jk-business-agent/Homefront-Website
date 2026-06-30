"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";

export default function CreditPage() {
  const [balance, setBalance] = useState(0);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  function load() { fetch("/api/account/credit", { cache: "no-store" }).then((r) => r.json()).then((d) => setBalance(d.storeCreditCents || 0)); }
  useEffect(load, []);

  async function redeem(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setMsg(""); setBusy(true);
    const res = await fetch("/api/gift-cards/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const d = await res.json(); setBusy(false);
    if (!res.ok) { setErr(d.error || "Could not redeem"); return; }
    setMsg(`🎉 ${formatPrice(d.creditedCents)} added! New balance: ${formatPrice(d.balanceCents)}.`);
    setCode(""); setBalance(d.balanceCents);
  }

  return (
    <div className="panel">
      <h2>Store Credit &amp; Gift Cards</h2>
      <p className="panel-sub">Your balance applies automatically at checkout.</p>

      <div style={{ background: "linear-gradient(180deg,#1b2c45,#16243a)", color: "#f3e9d8", borderRadius: 12, padding: "20px 24px", margin: "12px 0" }}>
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "var(--amber-soft)" }}>Available store credit</div>
        <div style={{ fontFamily: "var(--font-head)", fontSize: 38 }}>{formatPrice(balance)}</div>
      </div>

      <h3 style={{ fontSize: 15, color: "var(--navy)", textTransform: "uppercase", letterSpacing: ".3px" }}>Redeem a gift card</h3>
      {err && <div className="alert alert-error">{err}</div>}
      {msg && <div className="alert alert-ok">{msg}</div>}
      <form onSubmit={redeem} style={{ display: "flex", gap: 8, maxWidth: 440, flexWrap: "wrap" }}>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="HFGC-XXXX-XXXX-XXXX" required style={{ flex: 1, minWidth: 220, border: "1.5px solid var(--line)", borderRadius: 8, padding: "10px 13px", fontFamily: "monospace", textTransform: "uppercase" }} />
        <button className="btn btn-navy" disabled={busy}>{busy ? "…" : "Redeem"}</button>
      </form>

      <p style={{ marginTop: 16, fontSize: 13.5, fontFamily: "var(--font-body)" }}>Want to send one? <Link href="/gift-cards" className="muted-link">Buy a gift card →</Link></p>
    </div>
  );
}
