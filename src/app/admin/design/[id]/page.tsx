"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AdminNav from "@/components/AdminNav";
import { WIDGETS, getWidget, widgetConfig, type WidgetField } from "@/lib/widgets";

type Section = { id: string; type: string; order: number; enabled: boolean; config: string | null };
type Page = {
  id: string; key: string; title: string; published: boolean; system: boolean;
  showInNav: boolean; navLabel: string | null; navOrder: number; metaDescription: string | null;
  sections: Section[];
};

export default function PageEditor() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [adding, setAdding] = useState(false);
  const [meta, setMeta] = useState({ title: "", navLabel: "", navOrder: 0, metaDescription: "", showInNav: false, published: false });
  const [saved, setSaved] = useState("");
  const [bgUploading, setBgUploading] = useState(false);

  async function uploadBg(file: File) {
    setBgUploading(true);
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json(); setBgUploading(false);
    if (res.ok && data.url) setDraft((d) => ({ ...d, bgImage: data.url }));
  }

  const load = useCallback(() => {
    fetch(`/api/admin/pages/${id}`, { cache: "no-store" }).then((r) => r.json()).then((d) => {
      if (d.page) {
        setPage(d.page);
        setMeta({ title: d.page.title, navLabel: d.page.navLabel || "", navOrder: d.page.navOrder, metaDescription: d.page.metaDescription || "", showInNav: d.page.showInNav, published: d.page.published });
      }
    });
  }, [id]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login?next=/admin/design"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
    load();
  }, [user, loading, router, load]);

  async function saveMeta() {
    await fetch(`/api/admin/pages/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: meta.title, navLabel: meta.navLabel || null, navOrder: Number(meta.navOrder) || 0, metaDescription: meta.metaDescription || null, showInNav: meta.showInNav, published: meta.published }) });
    setSaved("Page settings saved"); setTimeout(() => setSaved(""), 2000); load();
  }
  async function addWidget(type: string) {
    setAdding(false);
    await fetch(`/api/admin/pages/${id}/sections`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }) });
    load();
  }
  function startEdit(s: Section) {
    setEditingId(s.id);
    setDraft({ ...widgetConfig(s.type, s.config), landingOnly: widgetConfig(s.type, s.config).landingOnly ?? false });
  }
  async function saveSection(s: Section) {
    await fetch(`/api/admin/sections/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config: draft }) });
    setEditingId(null); load();
  }
  async function toggleSection(s: Section) {
    await fetch(`/api/admin/sections/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !s.enabled }) });
    load();
  }
  async function removeSection(s: Section) {
    if (!confirm("Remove this widget from the page?")) return;
    await fetch(`/api/admin/sections/${s.id}`, { method: "DELETE" });
    load();
  }
  async function move(i: number, dir: -1 | 1) {
    if (!page) return;
    const j = i + dir; if (j < 0 || j >= page.sections.length) return;
    const ids = page.sections.map((s) => s.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await fetch(`/api/admin/pages/${id}/sections`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderedIds: ids }) });
    load();
  }

  if (loading || !user || user.role !== "ADMIN" || !page) return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;

  const isProductTemplate = page.key === "product-template";
  const CLEAN: Record<string, string> = { home: "/", about: "/about", vendors: "/vendors" };
  const liveHref = CLEAN[page.key] ?? `/p/${page.key}`;
  const pickerWidgets = isProductTemplate ? WIDGETS.filter((w) => w.productSafe) : WIDGETS;
  const inp = { border: "1.5px solid var(--line)", borderRadius: 8, padding: "9px 12px", fontFamily: "var(--font-body)", width: "100%" } as const;

  return (
    <div className="page">
      <AdminNav />
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Link href="/admin/design" className="muted-link">← All pages</Link>
        <h1 style={{ color: "var(--navy)", fontSize: 24, textTransform: "uppercase", letterSpacing: ".4px", margin: 0 }}>{page.title}</h1>
        {page.published ? <span className="badge badge-delivered">Published</span> : <span className="badge badge-pending">Draft</span>}
        {!isProductTemplate && <a className="btn btn-outline" style={{ padding: "6px 11px" }} href={liveHref} target="_blank" rel="noreferrer">View live →</a>}
      </div>
      {isProductTemplate && (
        <p style={{ color: "var(--muted)", fontFamily: "var(--font-body)", marginTop: 6, marginBottom: 0 }}>
          These widgets appear on <strong>every product page</strong>, below the reviews. Each product's own details (photos, price, description) fill in automatically.
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18, marginTop: 16, alignItems: "start" }}>
        {/* ---- Widgets column ---- */}
        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Widgets on this page</h3>
            <button className="btn btn-navy" style={{ padding: "7px 13px" }} onClick={() => setAdding(!adding)}>+ Add widget</button>
          </div>

          {adding && (
            <div className="widget-picker" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "12px 0", padding: 12, background: "var(--cream)", borderRadius: 10 }}>
              {pickerWidgets.map((w) => (
                <button key={w.type} onClick={() => addWidget(w.type)} style={{ textAlign: "left", border: "1px solid var(--line)", background: "#fff", borderRadius: 8, padding: "9px 11px", cursor: "pointer" }}>
                  <div style={{ fontWeight: 700 }}>{w.icon} {w.label}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-body)" }}>{w.description}</div>
                </button>
              ))}
            </div>
          )}

          {page.sections.length === 0 && <p style={{ color: "var(--muted)" }}>No widgets yet — click “Add widget”.</p>}

          {page.sections.map((s, i) => {
            const def = getWidget(s.type);
            const cfg = widgetConfig(s.type, s.config);
            return (
              <div className="order-card" key={s.id} style={{ opacity: s.enabled ? 1 : 0.55 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <button onClick={() => move(i, -1)} disabled={i === 0} style={{ border: "1px solid var(--line)", background: "#fff", borderRadius: 5, cursor: "pointer", width: 26 }}>↑</button>
                    <button onClick={() => move(i, 1)} disabled={i === page.sections.length - 1} style={{ border: "1px solid var(--line)", background: "#fff", borderRadius: 5, cursor: "pointer", width: 26 }}>↓</button>
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong>{def?.icon} {def?.label || s.type}</strong>
                    {!s.enabled && <span className="badge badge-pending" style={{ marginLeft: 8 }}>Hidden</span>}
                    {(def?.landingOnly || cfg.landingOnly) && <span className="badge" style={{ marginLeft: 8, background: "#eef", color: "#33c" }}>Home view only</span>}
                    {cfg.heading || cfg.headline ? <div style={{ fontSize: 12.5, color: "var(--muted)", fontFamily: "var(--font-body)" }}>{cfg.heading || cfg.headline}</div> : null}
                  </div>
                  <button className="btn btn-outline" style={{ padding: "6px 11px" }} onClick={() => (editingId === s.id ? setEditingId(null) : startEdit(s))}>{editingId === s.id ? "Close" : "Edit"}</button>
                  <button className="btn btn-outline" style={{ padding: "6px 11px" }} onClick={() => toggleSection(s)}>{s.enabled ? "Hide" : "Show"}</button>
                  <button className="remove" onClick={() => removeSection(s)}>Remove</button>
                </div>

                {editingId === s.id && def && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--line)", display: "grid", gap: 10 }}>
                    {def.fields.map((f: WidgetField) => {
                      if (f.showIf && String(draft[f.showIf.key]) !== f.showIf.equals) return null;
                      return (
                        <label key={f.key} style={{ display: "grid", gap: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</span>
                          {f.type === "textarea" ? (
                            <textarea style={{ ...inp, minHeight: 70 }} value={draft[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
                          ) : f.type === "boolean" ? (
                            <span><input type="checkbox" checked={!!draft[f.key]} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.checked })} /> <span style={{ fontSize: 13, color: "var(--muted)" }}>{f.help || "Enabled"}</span></span>
                          ) : f.type === "select" ? (
                            <select style={inp as any} value={draft[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}>
                              {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          ) : (
                            <input type={f.type === "number" ? "number" : "text"} style={inp} placeholder={f.placeholder} value={draft[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })} />
                          )}
                          {f.help && f.type !== "boolean" && <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{f.help}</span>}
                        </label>
                      );
                    })}
                    <label style={{ fontSize: 13 }}>
                      <input type="checkbox" checked={!!draft.landingOnly} onChange={(e) => setDraft({ ...draft, landingOnly: e.target.checked })} />{" "}
                      Only show on the main home view (hide when a shopper is browsing a category or searching)
                    </label>

                    {/* Background & style — color or image behind this section */}
                    <div style={{ borderTop: "1px dashed var(--line)", paddingTop: 10, display: "grid", gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", textTransform: "uppercase", letterSpacing: ".3px" }}>🎨 Background</span>

                      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                        <span style={{ width: 110 }}>Background color</span>
                        <input type="color" value={draft.bgColor || "#16243a"} onChange={(e) => setDraft({ ...draft, bgColor: e.target.value })} style={{ width: 48, height: 34, padding: 2, border: "1.5px solid var(--line)", borderRadius: 6 }} />
                        {draft.bgColor && <button type="button" className="btn btn-outline" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setDraft({ ...draft, bgColor: "" })}>Clear</button>}
                      </label>

                      <div style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 13 }}>Background image</span>
                        {draft.bgImage ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={draft.bgImage} alt="" style={{ width: 90, height: 56, objectFit: "cover", borderRadius: 6, border: "1px solid var(--line)" }} />
                            <button type="button" className="btn btn-outline" style={{ padding: "5px 11px", fontSize: 12 }} onClick={() => setDraft({ ...draft, bgImage: "" })}>Remove image</button>
                          </div>
                        ) : (
                          <label className="btn btn-outline" style={{ cursor: "pointer", width: "fit-content", padding: "7px 13px" }}>
                            {bgUploading ? "Uploading…" : "📷 Upload background image"}
                            <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBg(f); e.target.value = ""; }} />
                          </label>
                        )}
                      </div>

                      {(draft.bgImage || draft.bgColor) && (
                        <>
                          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                            <span style={{ width: 110 }}>Darken (readability)</span>
                            <input type="range" min={0} max={70} value={draft.bgOverlay ?? 0} onChange={(e) => setDraft({ ...draft, bgOverlay: Number(e.target.value) })} />
                            <span style={{ fontSize: 12, color: "var(--muted)" }}>{draft.bgOverlay ?? 0}%</span>
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                            <span style={{ width: 110 }}>Text color</span>
                            <select value={draft.textColor || "auto"} onChange={(e) => setDraft({ ...draft, textColor: e.target.value })} style={{ border: "1.5px solid var(--line)", borderRadius: 6, padding: "6px 10px" }}>
                              <option value="auto">Auto</option>
                              <option value="light">Light (for dark backgrounds)</option>
                              <option value="dark">Dark (for light backgrounds)</option>
                            </select>
                          </label>
                        </>
                      )}
                    </div>

                    <div>
                      <button className="btn btn-navy" onClick={() => saveSection(s)}>Save widget</button>
                      <button className="btn btn-outline" style={{ marginLeft: 8 }} onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ---- Page settings column ---- */}
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Page settings</h3>
          {saved && <div className="alert alert-ok" style={{ padding: "8px 10px" }}>{saved}</div>}
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 13, fontWeight: 600 }}>Title</span><input style={inp} value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} /></label>
            <label style={{ fontSize: 13.5 }}><input type="checkbox" checked={meta.published} onChange={(e) => setMeta({ ...meta, published: e.target.checked })} /> Published (visible to shoppers)</label>
            <label style={{ fontSize: 13.5 }}><input type="checkbox" checked={meta.showInNav} onChange={(e) => setMeta({ ...meta, showInNav: e.target.checked })} /> Show in top menu</label>
            {meta.showInNav && (
              <>
                <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 13, fontWeight: 600 }}>Menu label</span><input style={inp} placeholder={meta.title} value={meta.navLabel} onChange={(e) => setMeta({ ...meta, navLabel: e.target.value })} /></label>
                <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 13, fontWeight: 600 }}>Menu order</span><input type="number" style={inp} value={meta.navOrder} onChange={(e) => setMeta({ ...meta, navOrder: Number(e.target.value) })} /></label>
              </>
            )}
            <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 13, fontWeight: 600 }}>SEO description</span><textarea style={{ ...inp, minHeight: 60 }} value={meta.metaDescription} onChange={(e) => setMeta({ ...meta, metaDescription: e.target.value })} /></label>
            <button className="btn btn-navy" onClick={saveMeta}>Save settings</button>
          </div>
        </div>
      </div>
    </div>
  );
}
