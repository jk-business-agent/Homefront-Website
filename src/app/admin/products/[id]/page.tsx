"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AdminNav from "@/components/AdminNav";
import { CATEGORIES } from "@/lib/categories";

export default function EditProduct() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const [form, setForm] = useState<any>(null);
  const [storeName, setStoreName] = useState("");
  const [cats, setCats] = useState<string[]>(CATEGORIES);
  useEffect(() => { fetch("/api/categories").then((r) => r.json()).then((d) => { if (d.categories?.length) setCats(d.categories.map((c: any) => c.name)); }).catch(() => {}); }, []);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState(""); const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push(`/login?next=/admin/products/${id}`); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
    fetch(`/api/admin/products/${id}`, { cache: "no-store" }).then((r) => r.json()).then((d) => {
      const p = d.product; if (!p) { setErr("Not found"); return; }
      setStoreName(p.store?.name || "");
      setForm({
        name: p.name, description: p.description, price: (p.priceCents / 100).toFixed(2), category: p.category, emoji: p.emoji,
        madeInCity: p.madeInCity || "", madeInState: p.madeInState || "", stockQty: p.stockQty,
        weightOz: p.weightOz ?? "", shippingPrice: (p.shippingPriceCents / 100).toFixed(2), dimensions: p.dimensions || "",
        sizes: p.sizes || "", safetyInfo: p.safetyInfo || "", active: p.active,
        featuredHome: p.featuredHome, featuredCategory: p.featuredCategory, featuredNewsletter: p.featuredNewsletter,
      });
    });
  }, [user, loading, router, id]);

  function set(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(""); setErr("");
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name, description: form.description, priceCents: Math.round(parseFloat(form.price || "0") * 100),
        category: form.category, emoji: form.emoji, madeInCity: form.madeInCity || null, madeInState: form.madeInState || null,
        stockQty: parseInt(form.stockQty || "0", 10), weightOz: form.weightOz === "" ? null : parseInt(form.weightOz, 10),
        shippingPriceCents: Math.round(parseFloat(form.shippingPrice || "0") * 100), dimensions: form.dimensions || null,
        sizes: form.sizes || null, safetyInfo: form.safetyInfo || null, active: form.active,
        featuredHome: form.featuredHome, featuredCategory: form.featuredCategory, featuredNewsletter: form.featuredNewsletter,
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
      <div className="breadcrumb"><Link href="/admin/products">← All products</Link></div>
      <h1 style={{ color: "var(--navy)", fontSize: 25, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>Edit: {form.name}</h1>
      <p style={{ color: "var(--muted)", marginTop: 0, fontFamily: "var(--font-body)" }}>Sold by {storeName}</p>
      {msg && <div className="alert alert-ok" style={{ maxWidth: 760 }}>{msg}</div>}

      <form className="panel" onSubmit={save} style={{ maxWidth: 800 }}>
        {err && <div className="alert alert-error">{err}</div>}

        <div className="feature-box">
          <strong style={{ fontFamily: "var(--font-head)", textTransform: "uppercase", letterSpacing: ".4px", color: "var(--navy)" }}>⭐ Feature this product</strong>
          <div style={{ display: "flex", gap: 18, marginTop: 8, flexWrap: "wrap" }}>
            <label><input type="checkbox" checked={form.featuredHome} onChange={(e) => set("featuredHome", e.target.checked)} /> Home page</label>
            <label><input type="checkbox" checked={form.featuredCategory} onChange={(e) => set("featuredCategory", e.target.checked)} /> Top of its category ({form.category})</label>
            <label><input type="checkbox" checked={form.featuredNewsletter} onChange={(e) => set("featuredNewsletter", e.target.checked)} /> Newsletter page</label>
            <label><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /> Visible (active)</label>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
          <div className="field"><label>Name</label><input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="field"><label>Price (USD)</label><input type="number" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} /></div>
          <div className="field"><label>Stock</label><input type="number" value={form.stockQty} onChange={(e) => set("stockQty", e.target.value)} /></div>
        </div>
        <div className="field"><label>Description</label><textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
          <div className="field"><label>Category</label><select value={form.category} onChange={(e) => set("category", e.target.value)}>{cats.map((c) => <option key={c}>{c}</option>)}{!cats.includes(form.category) && <option>{form.category}</option>}</select></div>
          <div className="field"><label>Emoji</label><input value={form.emoji} onChange={(e) => set("emoji", e.target.value)} maxLength={4} /></div>
          <div className="field"><label>Made in (city)</label><input value={form.madeInCity} onChange={(e) => set("madeInCity", e.target.value)} /></div>
          <div className="field"><label>Made in (state)</label><input value={form.madeInState} onChange={(e) => set("madeInState", e.target.value)} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div className="field"><label>Weight (oz)</label><input type="number" value={form.weightOz} onChange={(e) => set("weightOz", e.target.value)} /></div>
          <div className="field"><label>Shipping price (USD)</label><input type="number" step="0.01" value={form.shippingPrice} onChange={(e) => set("shippingPrice", e.target.value)} /></div>
          <div className="field"><label>Dimensions</label><input value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field"><label>Sizes</label><input value={form.sizes} onChange={(e) => set("sizes", e.target.value)} placeholder="S, M, L, XL" /></div>
          <div className="field"><label>Safety / restrictions</label><input value={form.safetyInfo} onChange={(e) => set("safetyInfo", e.target.value)} /></div>
        </div>
        <button className="btn btn-navy" disabled={saving}>{saving ? "Saving…" : "Save product"}</button>
      </form>
    </div>
  );
}
