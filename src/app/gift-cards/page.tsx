"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

const PRESETS = [2500, 5000, 10000];

export default function GiftCardsPage() {
  const { user } = useAuth();
  const [amount, setAmount] = useState(5000);
  const [custom, setCustom] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  const cents = custom ? Math.round(parseFloat(custom) * 100) : amount;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setStatus("loading");
    const res = await fetch("/api/gift-cards/purchase", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountCents: cents, recipientEmail, message: message || undefined }) });
    const d = await res.json();
    if (!res.ok) { setStatus("error"); setErr(d.error || "Could not purchase"); return; }
    setCode(d.code); setStatus("done");
  }

  return (
    <div className="page" style={{ maxWidth: 620, margin: "0 auto" }}>
      <section className="about-hero"><h1>🎁 Gift Cards</h1><p>Give the gift of American-made. Delivered by email, redeemable for store credit.</p></section>

      {status === "done" ? (
        <div className="panel" style={{ textAlign: "center" }}>
          <h2>🎉 Gift card sent!</h2>
          <p className="panel-sub">We emailed it to {recipientEmail}. Here's the code in case you want to share it yourself:</p>
          <div style={{ background: "var(--cream)", borderRadius: 10, padding: "14px 18px", fontFamily: "monospace", fontSize: 20, letterSpacing: 1, margin: "10px 0" }}>{code}</div>
          <button className="btn btn-outline" onClick={() => { setStatus("idle"); setCode(""); setRecipientEmail(""); setMessage(""); }}>Send another</button>
        </div>
      ) : !user ? (
        <div className="panel"><p><Link href="/login?next=/gift-cards" className="muted-link">Sign in</Link> to purchase a gift card.</p></div>
      ) : (
        <form className="panel" onSubmit={submit}>
          <h2>Buy a gift card</h2>
          {err && <div className="alert alert-error">{err}</div>}
          <div className="field">
            <label>Amount</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PRESETS.map((p) => (
                <button type="button" key={p} className={`btn ${!custom && amount === p ? "btn-navy" : "btn-outline"}`} style={{ padding: "8px 16px" }} onClick={() => { setAmount(p); setCustom(""); }}>${p / 100}</button>
              ))}
              <input type="number" min="5" max="500" step="1" placeholder="Custom $" value={custom} onChange={(e) => setCustom(e.target.value)} style={{ width: 110, border: "1.5px solid var(--line)", borderRadius: 8, padding: "8px 11px" }} />
            </div>
          </div>
          <div className="field"><label>Recipient's email</label><input type="email" required value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="friend@email.com" /></div>
          <div className="field"><label>Message (optional)</label><textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Happy birthday! 🇺🇸" /></div>
          <div className="alert alert-ok">💳 Payment is simulated for now — no card is charged.</div>
          <button className="btn btn-navy" disabled={status === "loading" || !(cents >= 500)}>{status === "loading" ? "Sending…" : `Send $${(cents / 100).toFixed(0)} gift card`}</button>
        </form>
      )}
    </div>
  );
}
