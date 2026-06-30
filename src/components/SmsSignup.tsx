"use client";
import { useState } from "react";
import { SMS_CONSENT_TEXT } from "@/lib/sms";

// Compliant SMS opt-in: phone + an explicit (un-checked by default) consent box
// with the legal disclosure. Used on the landing page and at checkout.
export default function SmsSignup({ source = "landing", buttonLabel = "Text me deals" }: { source?: "landing" | "checkout" | "popup" | "footer"; buttonLabel?: string }) {
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) { setMessage("Please check the box to agree to receive texts."); setStatus("error"); return; }
    setStatus("loading"); setMessage("");
    try {
      const res = await fetch("/api/sms/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, consent, source }),
      });
      const data = await res.json();
      if (!res.ok) { setStatus("error"); setMessage(data.error || "Something went wrong"); return; }
      setStatus("done"); setMessage(data.alreadySubscribed ? "You're already signed up — thanks!" : "You're in! Watch for a text from us.");
      setPhone("");
    } catch { setStatus("error"); setMessage("Network error — please try again."); }
  }

  if (status === "done") return <div className="news-done">✅ {message}</div>;

  return (
    <form className="sms-form" onSubmit={submit}>
      <div className="news-form">
        <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(312) 555-1234" aria-label="Mobile phone number" autoComplete="tel" />
        <button type="submit" className="btn btn-gold" disabled={status === "loading"}>{status === "loading" ? "Signing up…" : buttonLabel}</button>
      </div>
      <label className="sms-consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>{SMS_CONSENT_TEXT}</span>
      </label>
      {status === "error" && <div className="news-error" style={{ marginTop: 6 }}>{message}</div>}
    </form>
  );
}
