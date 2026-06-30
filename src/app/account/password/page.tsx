"use client";
import { useState } from "react";

export default function PasswordPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(""); setErr("");
    if (next !== confirm) { setErr("New passwords don't match"); return; }
    setSaving(true);
    const res = await fetch("/api/account/password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const data = await res.json();
    if (res.ok) { setMsg("Password changed!"); setCurrent(""); setNext(""); setConfirm(""); }
    else setErr(data.error || "Could not change password");
    setSaving(false);
  }

  return (
    <div className="panel">
      <h2>Change Password</h2>
      <p className="panel-sub">Keep your account secure.</p>
      {msg && <div className="alert alert-ok">{msg}</div>}
      {err && <div className="alert alert-error">{err}</div>}
      <form onSubmit={submit} style={{ maxWidth: 440 }}>
        <div className="field"><label>Current password</label><input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" /></div>
        <div className="field"><label>New password</label><input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" /></div>
        <div className="field"><label>Confirm new password</label><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" /></div>
        <button className="btn btn-navy" disabled={saving}>{saving ? "Saving…" : "Update password"}</button>
      </form>
    </div>
  );
}
