"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "";
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [twoFactor, setTwoFactor] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, token: twoFactor ? token : undefined }),
      });
      const data = await res.json();
      // 2FA is on for this account — ask for the code, then resubmit.
      if (data.twoFactorRequired && !data.error) {
        setTwoFactor(true);
        setError("");
        return;
      }
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      await refresh();
      const dest = next || (data.user.role === "SELLER" ? "/seller" : data.user.role === "ADMIN" ? "/admin" : "/account");
      router.push(dest);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <h1>Sign in</h1>
      <p className="sub">Welcome back to Home Front Markets.</p>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={submit}>
        {!twoFactor ? (
          <>
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <button className="btn btn-navy btn-block" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
          </>
        ) : (
          <>
            <p style={{ fontFamily: "var(--font-body)", color: "var(--muted)", marginTop: 0 }}>
              🔐 Enter the 6-digit code from your authenticator app (or a backup code).
            </p>
            <div className="field">
              <label>Authentication code</label>
              <input value={token} onChange={(e) => setToken(e.target.value)} required autoFocus autoComplete="one-time-code"
                placeholder="123456" inputMode="text" />
            </div>
            <button className="btn btn-navy btn-block" disabled={loading}>{loading ? "Verifying…" : "Verify & sign in"}</button>
            <button type="button" className="btn btn-outline btn-block" style={{ marginTop: 8 }} onClick={() => { setTwoFactor(false); setToken(""); setError(""); }}>← Back</button>
          </>
        )}
      </form>
      <p style={{ marginTop: 18, fontSize: 14, color: "var(--muted)" }}>
        New here? <Link href="/register" className="muted-link">Create an account</Link> · <Link href="/sell" className="muted-link">Sell on HFM</Link>
      </p>
      <div style={{ marginTop: 18, padding: 12, background: "#faf7f2", borderRadius: 9, fontSize: 13, color: "var(--muted)" }}>
        <strong style={{ color: "var(--navy)" }}>Demo logins:</strong><br />
        Buyer — buyer@demo.com / password123<br />
        Seller — seller1@demo.com / password123
      </div>
    </div>
  );
}
