"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function RegisterForm({ defaultRole = "BUYER" }: { defaultRole?: "BUYER" | "SELLER" }) {
  const router = useRouter();
  const { refresh } = useAuth();
  const [role, setRole] = useState<"BUYER" | "SELLER">(defaultRole);
  const [form, setForm] = useState({ name: "", email: "", password: "", storeName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create account");
        return;
      }
      await refresh();
      router.push(role === "SELLER" ? "/seller/onboarding" : "/account");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <h1>{role === "SELLER" ? "Sell on Home Front Markets" : "Create your account"}</h1>
      <p className="sub">
        {role === "SELLER"
          ? "Open a shop and reach customers looking for American-made goods."
          : "Join the marketplace for American-made products."}
      </p>

      <div className="role-toggle">
        <button type="button" className={role === "BUYER" ? "active" : ""} onClick={() => setRole("BUYER")}>🛍️ I'm a shopper</button>
        <button type="button" className={role === "SELLER" ? "active" : ""} onClick={() => setRole("SELLER")}>🏭 I'm a seller</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={submit}>
        <div className="field">
          <label>{role === "SELLER" ? "Your name" : "Full name"}</label>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        {role === "SELLER" && (
          <div className="field">
            <label>Store name</label>
            <input value={form.storeName} onChange={(e) => set("storeName", e.target.value)} placeholder="e.g. Heartland Forge Co." required />
          </div>
        )}
        <div className="field">
          <label>Email</label>
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required autoComplete="email" />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={8} placeholder="At least 8 characters" autoComplete="new-password" />
        </div>
        <button className="btn btn-navy btn-block" disabled={loading}>
          {loading ? "Creating…" : role === "SELLER" ? "Open my shop" : "Create account"}
        </button>
      </form>
      <p style={{ marginTop: 18, fontSize: 14, color: "var(--muted)" }}>
        Already have an account? <Link href="/login" className="muted-link">Sign in</Link>
      </p>
    </div>
  );
}
