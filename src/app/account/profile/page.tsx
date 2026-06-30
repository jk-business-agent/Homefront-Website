"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function ProfilePage() {
  const { refresh } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<{ name: string; email: string; createdAt: string } | null>(null);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [privMsg, setPrivMsg] = useState("");

  useEffect(() => {
    fetch("/api/account/profile", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      if (d.profile) { setProfile(d.profile); setName(d.profile.name); }
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg("");
    const res = await fetch("/api/account/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    if (res.ok) { setMsg("Saved!"); refresh(); } else setMsg("Could not save");
    setSaving(false);
  }

  async function deleteAccount() {
    if (!confirm("Permanently delete your account and personal data? This cannot be undone.")) return;
    setDeleting(true); setPrivMsg("");
    const res = await fetch("/api/account", { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      await refresh();
      router.push("/");
    } else {
      setPrivMsg(data.error || "Could not delete your account.");
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="panel">
        <h2>Account Info</h2>
        <p className="panel-sub">Your name and account details.</p>
        {msg && <div className="alert alert-ok">{msg}</div>}
        <form onSubmit={save} style={{ maxWidth: 440 }}>
          <div className="field"><label>Full name</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="field"><label>Email</label><input value={profile?.email || ""} disabled style={{ background: "var(--cream)" }} /></div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -8 }}>Email changes aren't available yet — coming soon.</p>
          <button className="btn btn-navy" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        </form>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h2>Privacy &amp; your data</h2>
        <p className="panel-sub">You're in control of your information.</p>
        {privMsg && <div className="alert alert-err">{privMsg}</div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <a className="btn btn-outline" href="/api/account/export" download>⬇ Download my data</a>
          <button type="button" className="btn" style={{ color: "#a11", borderColor: "#a11", background: "transparent", border: "1px solid #a11" }} onClick={deleteAccount} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete my account"}
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 12, maxWidth: 520 }}>
          Download a full copy of everything we store about you, or permanently delete your account.
          Accounts with order history or a store need to contact support so we can meet tax/record-keeping rules.
        </p>
      </div>
    </>
  );
}
