"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function BackInStockButton({ productId }: { productId: string }) {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading"); setMsg("");
    const res = await fetch(`/api/products/${productId}/stock-alert`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const d = await res.json();
    if (!res.ok) { setStatus("error"); setMsg(d.error || "Could not sign up"); return; }
    setStatus("done");
  }

  return (
    <div>
      <button className="btn btn-outline btn-block" disabled>Out of stock</button>
      {status === "done" ? (
        <div className="alert alert-ok" style={{ marginTop: 10 }}>🔔 We'll email you the moment it's back in stock.</div>
      ) : (
        <form onSubmit={submit} style={{ marginTop: 10 }}>
          <p style={{ fontSize: 13, color: "var(--muted)", fontFamily: "var(--font-body)", margin: "0 0 6px" }}>Want it when it's back?</p>
          <div className="news-form">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" aria-label="Email" />
            <button type="submit" className="btn btn-navy" disabled={status === "loading"}>{status === "loading" ? "…" : "🔔 Notify me"}</button>
          </div>
          {status === "error" && <span className="news-error">{msg}</span>}
        </form>
      )}
    </div>
  );
}
