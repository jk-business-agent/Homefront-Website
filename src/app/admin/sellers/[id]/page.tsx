"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AdminNav from "@/components/AdminNav";

export default function EditSeller() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const [form, setForm] = useState<any>(null);
  const [meta, setMeta] = useState<any>(null);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState(""); const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push(`/login?next=/admin/sellers/${id}`); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
    fetch(`/api/admin/sellers/${id}`, { cache: "no-store" }).then((r) => r.json()).then((d) => {
      const s = d.store; if (!s) { setErr("Not found"); return; }
      setMeta({
        email: s.owner?.email, products: s._count?.products,
        legalName: s.legalName, businessType: s.businessType, taxIdType: s.taxIdType, taxIdMasked: s.taxIdMasked,
        legalAddr: [s.legalLine1, s.legalCity, s.legalState, s.legalZip].filter(Boolean).join(", "),
        w9Name: s.w9Name, w9AcceptedAt: s.w9AcceptedAt, onboardingComplete: s.onboardingComplete, w9OnFile: s.w9OnFile,
      });
      setForm({
        name: s.name || "", bio: s.bio || "", story: s.story || "", city: s.city || "", state: s.state || "",
        employees: s.employees ?? "", foundedYear: s.foundedYear ?? "",
        shipFromLine1: s.shipFromLine1 || "", shipFromCity: s.shipFromCity || "", shipFromState: s.shipFromState || "", shipFromZip: s.shipFromZip || "",
        approved: s.approved, featured: s.featured,
      });
    });
  }, [user, loading, router, id]);

  function set(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(""); setErr("");
    const res = await fetch(`/api/admin/sellers/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        employees: form.employees === "" ? null : parseInt(form.employees, 10),
        foundedYear: form.foundedYear === "" ? null : parseInt(form.foundedYear, 10),
      }),
    });
    const data = await res.json(); setSaving(false);
    if (!res.ok) { setErr(data.error || "Could not save"); return; }
    setMsg("Saved!");
  }

  if (loading || !user || user.role !== "ADMIN" || !form) return <div className="page"><AdminNav /><p style={{ color: "var(--muted)" }}>{err || "Loading…"}</p></div>;

  return (
    <div className="page">
      <AdminNav />
      <div className="breadcrumb"><Link href="/admin/sellers">← All sellers</Link></div>
      <h1 style={{ color: "var(--navy)", fontSize: 25, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>Edit: {form.name}</h1>
      <p style={{ color: "var(--muted)", marginTop: 0, fontFamily: "var(--font-body)" }}>{meta?.email} · {meta?.products} products</p>
      {msg && <div className="alert alert-ok" style={{ maxWidth: 720 }}>{msg}</div>}

      <form className="panel" onSubmit={save} style={{ maxWidth: 760 }}>
        {err && <div className="alert alert-error">{err}</div>}
        <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: "var(--font-body)" }}><input type="checkbox" checked={form.approved} onChange={(e) => set("approved", e.target.checked)} /> Approved (visible on storefront)</label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: "var(--font-body)" }}><input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} /> Featured on Vendors page</label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
          <div className="field"><label>Store name</label><input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="field"><label>City</label><input value={form.city} onChange={(e) => set("city", e.target.value)} /></div>
          <div className="field"><label>State</label><input value={form.state} onChange={(e) => set("state", e.target.value)} /></div>
        </div>
        <div className="field"><label>Tagline</label><input value={form.bio} onChange={(e) => set("bio", e.target.value)} /></div>
        <div className="field"><label>Story (shown on product pages)</label><textarea rows={4} value={form.story} onChange={(e) => set("story", e.target.value)} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field"><label>U.S. employees</label><input type="number" value={form.employees} onChange={(e) => set("employees", e.target.value)} /></div>
          <div className="field"><label>Year founded</label><input type="number" value={form.foundedYear} onChange={(e) => set("foundedYear", e.target.value)} /></div>
        </div>
        <h3 style={{ color: "var(--navy)", textTransform: "uppercase", letterSpacing: ".3px", fontSize: 15, marginTop: 16 }}>📦 Ship-from address</h3>
        <div className="field"><label>Street</label><input value={form.shipFromLine1} onChange={(e) => set("shipFromLine1", e.target.value)} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
          <div className="field"><label>City</label><input value={form.shipFromCity} onChange={(e) => set("shipFromCity", e.target.value)} /></div>
          <div className="field"><label>State</label><input value={form.shipFromState} onChange={(e) => set("shipFromState", e.target.value)} /></div>
          <div className="field"><label>ZIP</label><input value={form.shipFromZip} onChange={(e) => set("shipFromZip", e.target.value)} /></div>
        </div>
        <button className="btn btn-navy" disabled={saving}>{saving ? "Saving…" : "Save seller"}</button>
      </form>

      {/* W-9 / legal records (read-only) */}
      <div className="panel" style={{ maxWidth: 760 }}>
        <h2>🔒 Business &amp; Tax (W-9) on file</h2>
        <p className="panel-sub">For your records / 1099 reporting. Tax ID is masked for security.</p>
        {meta?.w9OnFile ? (
          <ul className="specs">
            <li><span>Legal name</span><b>{meta.legalName || "—"}</b></li>
            <li><span>Business type</span><b>{meta.businessType || "—"}</b></li>
            <li><span>{meta.taxIdType || "Tax ID"}</span><b>{meta.taxIdMasked || "—"}</b></li>
            <li><span>Business address</span><b>{meta.legalAddr || "—"}</b></li>
            <li><span>Certified by</span><b>{meta.w9Name || "—"}</b></li>
            <li><span>W-9 accepted</span><b>{meta.w9AcceptedAt ? new Date(meta.w9AcceptedAt).toLocaleDateString() : "—"}</b></li>
            <li><span>Onboarding</span><b>{meta.onboardingComplete ? "Complete" : "Incomplete"}</b></li>
          </ul>
        ) : (
          <div className="alert alert-error">No W-9 / tax info collected yet — this seller hasn't finished onboarding.</div>
        )}
      </div>
    </div>
  );
}
