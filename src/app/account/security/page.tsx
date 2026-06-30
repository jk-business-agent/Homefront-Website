"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

type Status = { enabled: boolean; backupRemaining: number };
type Event = { id: string; type: string; ip: string | null; userAgent: string | null; createdAt: string };

const EVENT_LABEL: Record<string, string> = {
  login: "🔑 Signed in",
  password_change: "🔒 Password changed",
  "2fa_enabled": "🔐 Two-factor turned on",
  "2fa_disabled": "🔓 Two-factor turned off",
  logout_all: "🚪 Signed out of all devices",
};

export default function SecurityPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [status, setStatus] = useState<Status | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingOut, setLoadingOut] = useState(false);
  const [step, setStep] = useState<"idle" | "setup" | "done">("idle");
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disableInput, setDisableInput] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/account/2fa", { cache: "no-store" }).then((r) => r.json()).then(setStatus);
    fetch("/api/account/security-events", { cache: "no-store" }).then((r) => r.json()).then((d) => setEvents(d.events || []));
  }
  useEffect(() => { load(); }, []);

  async function logoutEverywhere() {
    if (!confirm("Sign out of all devices? You'll need to sign in again here too.")) return;
    setLoadingOut(true);
    await fetch("/api/account/logout-all", { method: "POST" });
    await refresh();
    router.push("/login");
  }

  async function startSetup() {
    setErr(""); setBusy(true);
    const res = await fetch("/api/account/2fa/setup", { method: "POST" });
    const data = await res.json(); setBusy(false);
    if (!res.ok) { setErr(data.error || "Could not start setup"); return; }
    setSecret(data.secret); setUri(data.otpauthUri); setStep("setup");
  }
  async function confirmEnable(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    const res = await fetch("/api/account/2fa/enable", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: code }) });
    const data = await res.json(); setBusy(false);
    if (!res.ok) { setErr(data.error || "Could not enable"); return; }
    setBackupCodes(data.backupCodes || []); setStep("done"); setCode(""); load();
  }
  async function disable(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    const body = /^\d{6}$/.test(disableInput.trim()) ? { token: disableInput.trim() } : { password: disableInput };
    const res = await fetch("/api/account/2fa/disable", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json(); setBusy(false);
    if (!res.ok) { setErr(data.error || "Could not disable"); return; }
    setDisableInput(""); setStep("idle"); load();
  }

  const groupedSecret = secret.replace(/(.{4})/g, "$1 ").trim();
  const box = { border: "1.5px solid var(--line)", borderRadius: 8, padding: "10px 13px", fontFamily: "var(--font-body)", width: "100%" } as const;

  return (
    <>
    <div className="panel">
      <h2>Two-Factor Authentication</h2>
      <p className="panel-sub">Add a second step at sign-in using an authenticator app (Google Authenticator, Authy, 1Password…).</p>
      {err && <div className="alert alert-error">{err}</div>}

      {!status ? (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      ) : status.enabled && step !== "done" ? (
        <>
          <div className="alert alert-ok">✅ Two-factor authentication is <strong>ON</strong>. {status.backupRemaining} backup code{status.backupRemaining !== 1 ? "s" : ""} remaining.</div>
          <form onSubmit={disable} style={{ maxWidth: 420, marginTop: 12 }}>
            <h3 style={{ fontSize: 15, color: "var(--navy)", textTransform: "uppercase", letterSpacing: ".3px" }}>Turn off 2FA</h3>
            <div className="field"><label>Current 6-digit code or your password</label><input value={disableInput} onChange={(e) => setDisableInput(e.target.value)} required /></div>
            <button className="btn" style={{ background: "transparent", color: "#a11", border: "1px solid #a11" }} disabled={busy}>{busy ? "…" : "Turn off two-factor"}</button>
          </form>
        </>
      ) : step === "done" ? (
        <>
          <div className="alert alert-ok">🎉 Two-factor is now ON. Save these <strong>backup codes</strong> somewhere safe — each works once if you lose your phone.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, maxWidth: 360, margin: "12px 0", fontFamily: "monospace", fontSize: 15 }}>
            {backupCodes.map((c) => <div key={c} style={{ background: "var(--cream)", borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>{c}</div>)}
          </div>
          <button className="btn btn-navy" onClick={() => setStep("idle")}>Done — I saved my codes</button>
        </>
      ) : step === "setup" ? (
        <form onSubmit={confirmEnable} style={{ maxWidth: 480 }}>
          <h3 style={{ fontSize: 15, color: "var(--navy)", textTransform: "uppercase", letterSpacing: ".3px" }}>1. Add to your authenticator app</h3>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#3a3022" }}>
            In your app, choose “Add account” → “Enter a setup key”, and type this key (issuer: Homefront Markets):
          </p>
          <div style={{ background: "var(--cream)", borderRadius: 8, padding: "12px 14px", fontFamily: "monospace", fontSize: 18, letterSpacing: "2px", textAlign: "center", margin: "8px 0" }}>{groupedSecret}</div>
          <details style={{ marginBottom: 12 }}>
            <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--muted)" }}>Advanced: setup URI</summary>
            <code style={{ wordBreak: "break-all", fontSize: 12, display: "block", marginTop: 6 }}>{uri}</code>
          </details>
          <h3 style={{ fontSize: 15, color: "var(--navy)", textTransform: "uppercase", letterSpacing: ".3px" }}>2. Enter the 6-digit code it shows</h3>
          <div className="field"><input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" inputMode="numeric" autoFocus required style={box} /></div>
          <button className="btn btn-navy" disabled={busy}>{busy ? "Verifying…" : "Verify & turn on"}</button>
          <button type="button" className="btn btn-outline" style={{ marginLeft: 8 }} onClick={() => setStep("idle")}>Cancel</button>
        </form>
      ) : (
        <>
          <p style={{ fontFamily: "var(--font-body)", color: "#3a3022" }}>2FA is currently <strong>off</strong>. Turn it on for stronger account protection.</p>
          <button className="btn btn-navy" onClick={startSetup} disabled={busy}>{busy ? "…" : "🔐 Set up two-factor"}</button>
        </>
      )}
    </div>

    <div className="panel" style={{ marginTop: 18 }}>
      <h2>Sessions &amp; Recent Activity</h2>
      <p className="panel-sub">Signed in somewhere you don't recognize? Sign out everywhere — it ends every session, including this one.</p>
      <button className="btn btn-outline" onClick={logoutEverywhere} disabled={loadingOut}>{loadingOut ? "Signing out…" : "🚪 Sign out of all devices"}</button>

      <h3 style={{ fontSize: 15, color: "var(--navy)", textTransform: "uppercase", letterSpacing: ".3px", marginTop: 18 }}>Recent activity</h3>
      {events.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No recent activity recorded yet.</p>
      ) : (
        <div>
          {events.map((e) => (
            <div key={e.id} className="line-item" style={{ borderBottom: "1px solid var(--line)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{EVENT_LABEL[e.type] || e.type}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-body)" }}>
                  {new Date(e.createdAt).toLocaleString()}{e.ip && e.ip !== "local" ? ` · IP ${e.ip}` : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
