"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AdminNav from "@/components/AdminNav";
import { HEADING_FONTS, BODY_FONTS } from "@/lib/theme";

// ISO string -> value for <input type="datetime-local"> in local time.
const toInput = (v: string | null) => (v ? new Date(v).toLocaleString("sv").slice(0, 16).replace(" ", "T") : "");

export default function AdminSettings() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [form, setForm] = useState<any>(null);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState(""); const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login?next=/admin/settings"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
    fetch("/api/admin/settings", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      const s = d.settings || {};
      setForm({ ...s, announcementStart: toInput(s.announcementStart), announcementEnd: toInput(s.announcementEnd), announcementLink: s.announcementLink || "" });
    });
  }, [user, loading, router]);

  function set(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(""); setErr("");
    const res = await fetch("/api/admin/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        announcement: form.announcement, announcementEnabled: form.announcementEnabled,
        announcementLink: form.announcementLink || null, announcementStart: form.announcementStart || null, announcementEnd: form.announcementEnd || null,
        heroHeadline: form.heroHeadline, heroSubtext: form.heroSubtext,
        heroCtaText: form.heroCtaText, accentColor: form.accentColor, primaryColor: form.primaryColor,
        headingFont: form.headingFont, bodyFont: form.bodyFont, footerTagline: form.footerTagline, popupEnabled: form.popupEnabled,
      }),
    });
    const data = await res.json(); setSaving(false);
    if (!res.ok) { setErr(data.error || "Could not save"); return; }
    setMsg("Saved! Refresh the storefront to see your changes.");
  }

  if (loading || !user || user.role !== "ADMIN" || !form) return <div className="page"><AdminNav /><p style={{ color: "var(--muted)" }}>Loading…</p></div>;

  return (
    <div className="page">
      <AdminNav />
      <h1 style={{ color: "var(--navy)", fontSize: 26, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>Customize Site</h1>
      <p style={{ color: "var(--muted)", marginTop: 0, fontFamily: "var(--font-body)" }}>Change the headline, banner, colors, and copy across your storefront — no code.</p>
      {msg && <div className="alert alert-ok" style={{ maxWidth: 760 }}>{msg}</div>}

      <form className="panel" onSubmit={save} style={{ maxWidth: 760 }}>
        {err && <div className="alert alert-error">{err}</div>}

        <h3 style={{ color: "var(--navy)", textTransform: "uppercase", letterSpacing: ".3px", fontSize: 15, marginTop: 0 }}>Top announcement bar</h3>
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, fontFamily: "var(--font-body)" }}>
          <input type="checkbox" checked={!!form.announcementEnabled} onChange={(e) => set("announcementEnabled", e.target.checked)} /> Show the announcement bar
        </label>
        <div className="field"><label>Message</label><input value={form.announcement} onChange={(e) => set("announcement", e.target.value)} /></div>
        <div className="field"><label>Link (optional)</label><input placeholder="/p/our-promise or https://…" value={form.announcementLink || ""} onChange={(e) => set("announcementLink", e.target.value)} /></div>
        <div className="field" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div><label>Start (optional)</label><input type="datetime-local" value={form.announcementStart || ""} onChange={(e) => set("announcementStart", e.target.value)} /></div>
          <div><label>End (optional)</label><input type="datetime-local" value={form.announcementEnd || ""} onChange={(e) => set("announcementEnd", e.target.value)} /></div>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: -4 }}>Leave dates blank to show it all the time. Set a window to schedule a sale banner.</p>

        <h3 style={{ color: "var(--navy)", textTransform: "uppercase", letterSpacing: ".3px", fontSize: 15 }}>Homepage hero</h3>
        <div className="field"><label>Headline</label><input value={form.heroHeadline} onChange={(e) => set("heroHeadline", e.target.value)} /></div>
        <div className="field"><label>Subtext</label><textarea rows={2} value={form.heroSubtext} onChange={(e) => set("heroSubtext", e.target.value)} /></div>
        <div className="field"><label>Button text</label><input value={form.heroCtaText} onChange={(e) => set("heroCtaText", e.target.value)} /></div>

        <h3 style={{ color: "var(--navy)", textTransform: "uppercase", letterSpacing: ".3px", fontSize: 15 }}>Look & feel</h3>
        <div className="field" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <label>Accent color</label>
            <input type="color" value={form.accentColor} onChange={(e) => set("accentColor", e.target.value)} style={{ width: 60, height: 40, padding: 2, border: "1.5px solid var(--line)", borderRadius: 8 }} />
          </div>
          <code style={{ background: "var(--cream)", padding: "4px 8px", borderRadius: 6 }}>{form.accentColor}</code>
          <div style={{ marginLeft: 8 }}>
            <label>Primary color</label>
            <input type="color" value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} style={{ width: 60, height: 40, padding: 2, border: "1.5px solid var(--line)", borderRadius: 8 }} />
          </div>
          <code style={{ background: "var(--cream)", padding: "4px 8px", borderRadius: 6 }}>{form.primaryColor}</code>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: -4 }}>Accent = highlights, search button, badges. Primary = header, footer, and main buttons.</p>
        <div className="field" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div><label>Heading font</label>
            <select value={form.headingFont} onChange={(e) => set("headingFont", e.target.value)} style={{ border: "1.5px solid var(--line)", borderRadius: 8, padding: "9px 12px", fontFamily: "var(--font-body)" }}>
              {HEADING_FONTS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
          <div><label>Body font</label>
            <select value={form.bodyFont} onChange={(e) => set("bodyFont", e.target.value)} style={{ border: "1.5px solid var(--line)", borderRadius: 8, padding: "9px 12px", fontFamily: "var(--font-body)" }}>
              {BODY_FONTS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
        </div>

        <h3 style={{ color: "var(--navy)", textTransform: "uppercase", letterSpacing: ".3px", fontSize: 15 }}>Footer</h3>
        <div className="field"><label>Tagline</label><textarea rows={2} value={form.footerTagline} onChange={(e) => set("footerTagline", e.target.value)} /></div>

        <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0 16px", fontFamily: "var(--font-body)" }}>
          <input type="checkbox" checked={form.popupEnabled} onChange={(e) => set("popupEnabled", e.target.checked)} /> Show the welcome newsletter popup to new visitors
        </label>

        <button className="btn btn-navy" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
      </form>
      <p style={{ marginTop: 10, fontSize: 13 }}><Link href="/" className="muted-link">← View storefront</Link></p>
    </div>
  );
}
