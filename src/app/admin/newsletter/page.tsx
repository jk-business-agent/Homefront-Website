"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AdminNav from "@/components/AdminNav";
import { Block, parseBlocks, blocksFromBody } from "@/lib/post-blocks";

type Post = {
  id: string; title: string; slug: string; excerpt: string; body: string; blocks: string | null;
  coverEmoji: string; coverImage: string | null; author: string; category: string;
  published: boolean; createdAt: string;
};

const BLANK = { title: "", category: "Maker Stories", author: "Homefront Markets", coverEmoji: "📰", coverImage: "", excerpt: "", published: true };

export default function NewsletterAdmin() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<any>(BLANK);
  const [blocks, setBlocks] = useState<Block[]>([{ type: "text", value: "" }]);
  const [allProducts, setAllProducts] = useState<{ id: string; name: string; emoji: string }[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/posts", { cache: "no-store" }).then((r) => r.json()).then((d) => setPosts(d.posts || []));
  }, []);

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" }).then((r) => r.json())
      .then((d) => setAllProducts((d.products || []).map((p: any) => ({ id: p.id, name: p.name, emoji: p.emoji }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login?next=/admin/newsletter"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
    load();
  }, [user, loading, router, load]);

  function set(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }

  function startNew() {
    setForm(BLANK); setBlocks([{ type: "text", value: "" }]); setEditing("new"); setMsg(""); setErr("");
  }
  function startEdit(p: Post) {
    setForm({ title: p.title, category: p.category, author: p.author, coverEmoji: p.coverEmoji, coverImage: p.coverImage || "", excerpt: p.excerpt, published: p.published });
    const b = parseBlocks(p.blocks);
    setBlocks(b.length ? b : (blocksFromBody(p.body).length ? blocksFromBody(p.body) : [{ type: "text", value: "" }]));
    setEditing(p.id); setMsg(""); setErr("");
  }

  // ----- block operations -----
  function addBlock(type: Block["type"]) {
    const fresh: Block =
      type === "image" ? { type: "image", url: "", caption: "" } :
      type === "quote" ? { type: "quote", value: "", attribution: "" } :
      type === "button" ? { type: "button", label: "", href: "" } :
      type === "product" ? { type: "product", productId: allProducts[0]?.id || "" } :
      { type, value: "" } as Block;
    setBlocks((bs) => [...bs, fresh]);
  }

  function onDrop(target: number) {
    setBlocks((bs) => {
      if (dragIndex === null || dragIndex === target) return bs;
      const copy = [...bs];
      const [moved] = copy.splice(dragIndex, 1);
      copy.splice(target, 0, moved);
      return copy;
    });
    setDragIndex(null);
  }
  function updateBlock(i: number, patch: Partial<Block>) {
    setBlocks((bs) => bs.map((b, idx) => (idx === i ? ({ ...b, ...patch } as Block) : b)));
  }
  function moveBlock(i: number, dir: -1 | 1) {
    setBlocks((bs) => {
      const j = i + dir; if (j < 0 || j >= bs.length) return bs;
      const copy = [...bs]; [copy[i], copy[j]] = [copy[j], copy[i]]; return copy;
    });
  }
  function removeBlock(i: number) { setBlocks((bs) => bs.filter((_, idx) => idx !== i)); }

  async function uploadInto(i: number, file: File) {
    setUploading(true); setErr("");
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) updateBlock(i, { url: data.url } as any); else setErr(data.error || "Upload failed");
    setUploading(false);
  }

  async function onCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) set("coverImage", data.url); else setErr(data.error || "Upload failed");
    setUploading(false); e.target.value = "";
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr(""); setMsg("");
    const clean = blocks.filter((b) =>
      b.type === "image" ? b.url :
      b.type === "product" ? b.productId :
      b.type === "button" ? (b.label && b.href) :
      (b.value || "").trim()
    );
    if (clean.length === 0) { setErr("Add at least one text or image block."); setSaving(false); return; }
    const isNew = editing === "new";
    const res = await fetch(isNew ? "/api/admin/posts" : `/api/admin/posts/${editing}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, coverImage: form.coverImage || null, blocks: JSON.stringify(clean) }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(data.error || "Could not save"); return; }
    setMsg(isNew ? "Story published!" : "Story updated!");
    setEditing(null); load();
  }

  async function togglePublish(p: Post) {
    await fetch(`/api/admin/posts/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: !p.published }) });
    load();
  }
  async function remove(p: Post) {
    await fetch(`/api/admin/posts/${p.id}`, { method: "DELETE" });
    load();
  }

  if (loading || !user || user.role !== "ADMIN") {
    return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;
  }

  return (
    <div className="page">
      <AdminNav />
      <h1 style={{ color: "var(--navy)", fontSize: 26, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>Newsletter Manager</h1>
      <p style={{ color: "var(--muted)", marginTop: 0, fontFamily: "var(--font-body)" }}>Build stories with text, headings, and images down the page — no code.</p>
      {msg && <div className="alert alert-ok" style={{ maxWidth: 760 }}>{msg}</div>}

      {editing ? (
        <form className="panel" onSubmit={save} style={{ maxWidth: 820 }}>
          <h2>{editing === "new" ? "New story" : "Edit story"}</h2>
          {err && <div className="alert alert-error">{err}</div>}

          <div className="field"><label>Title</label><input value={form.title} onChange={(e) => set("title", e.target.value)} required /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px", gap: 12 }}>
            <div className="field"><label>Category</label><input value={form.category} onChange={(e) => set("category", e.target.value)} /></div>
            <div className="field"><label>Author</label><input value={form.author} onChange={(e) => set("author", e.target.value)} /></div>
            <div className="field"><label>Emoji</label><input value={form.coverEmoji} onChange={(e) => set("coverEmoji", e.target.value)} maxLength={4} /></div>
          </div>
          <div className="field">
            <label>Cover image (top of the article — optional)</label>
            {form.coverImage && <div className="media-row"><img className="m" src={form.coverImage} alt="" style={{ width: 140, height: 90 }} /></div>}
            <label className="upload-btn">{uploading ? "Uploading…" : "📷 Upload cover"}<input type="file" accept="image/*" hidden onChange={onCover} /></label>
            {form.coverImage && <button type="button" className="remove" onClick={() => set("coverImage", "")} style={{ marginLeft: 10 }}>Remove</button>}
          </div>
          <div className="field"><label>Teaser (shown in lists &amp; the popup)</label><textarea rows={2} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} required /></div>

          {/* ----- Block editor ----- */}
          <label style={{ display: "block", fontFamily: "var(--font-head)", fontSize: 12, letterSpacing: ".5px", textTransform: "uppercase", color: "var(--navy)", margin: "10px 0 8px" }}>Article content</label>
          {blocks.map((b, i) => {
            const tag: Record<string, string> = { text: "📝 Text", heading: "🔠 Heading", image: "🖼️ Image", quote: "❝ Quote", button: "🔘 Button", product: "🛍️ Product" };
            return (
              <div
                className={`block-edit ${dragIndex === i ? "dragging" : ""}`}
                key={i}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(i)}
                onDragEnd={() => setDragIndex(null)}
              >
                <div className="block-edit-head">
                  <span className="block-tag"><span className="drag-handle" title="Drag to reorder">⠿</span> {tag[b.type]}</span>
                  <div className="block-ctrls">
                    <button type="button" onClick={() => moveBlock(i, -1)} disabled={i === 0} title="Move up">↑</button>
                    <button type="button" onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1} title="Move down">↓</button>
                    <button type="button" onClick={() => removeBlock(i)} title="Delete" className="block-del">✕</button>
                  </div>
                </div>
                {b.type === "text" && <textarea rows={4} placeholder="Write a paragraph…" value={b.value} onChange={(e) => updateBlock(i, { value: e.target.value } as any)} />}
                {b.type === "heading" && <input placeholder="Section heading" value={b.value} onChange={(e) => updateBlock(i, { value: e.target.value } as any)} />}
                {b.type === "quote" && (
                  <div>
                    <textarea rows={2} placeholder="Pull quote…" value={b.value} onChange={(e) => updateBlock(i, { value: e.target.value } as any)} />
                    <input style={{ marginTop: 8 }} placeholder="Attribution (optional) — e.g. Jane, founder" value={b.attribution || ""} onChange={(e) => updateBlock(i, { attribution: e.target.value } as any)} />
                  </div>
                )}
                {b.type === "button" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input placeholder="Button text — e.g. Shop now" value={b.label} onChange={(e) => updateBlock(i, { label: e.target.value } as any)} />
                    <input placeholder="Link — e.g. /?category=Tools" value={b.href} onChange={(e) => updateBlock(i, { href: e.target.value } as any)} />
                  </div>
                )}
                {b.type === "product" && (
                  <select value={b.productId} onChange={(e) => updateBlock(i, { productId: e.target.value } as any)}>
                    <option value="">— Pick a product to feature —</option>
                    {allProducts.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
                  </select>
                )}
                {b.type === "image" && (
                  <div>
                    {b.url ? <img className="block-img-preview" src={b.url} alt="" /> : <div className="img-ph" style={{ height: 120, marginBottom: 8 }}>No image yet</div>}
                    <label className="upload-btn">{uploading ? "Uploading…" : (b.url ? "📷 Replace image" : "📷 Upload image")}
                      <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadInto(i, f); e.target.value = ""; }} />
                    </label>
                    <input style={{ marginTop: 8 }} placeholder="Caption (optional)" value={b.caption || ""} onChange={(e) => updateBlock(i, { caption: e.target.value } as any)} />
                  </div>
                )}
              </div>
            );
          })}
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 8px" }}>Tip: drag the ⠿ handle to reorder blocks.</p>
          <div style={{ display: "flex", gap: 8, margin: "0 0 16px", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-outline" onClick={() => addBlock("text")}>+ Text</button>
            <button type="button" className="btn btn-outline" onClick={() => addBlock("heading")}>+ Heading</button>
            <button type="button" className="btn btn-outline" onClick={() => addBlock("image")}>+ Image</button>
            <button type="button" className="btn btn-outline" onClick={() => addBlock("quote")}>+ Quote</button>
            <button type="button" className="btn btn-outline" onClick={() => addBlock("button")}>+ Button</button>
            <button type="button" className="btn btn-outline" onClick={() => addBlock("product")}>+ Product</button>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontFamily: "var(--font-body)" }}>
            <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} /> Published (visible to customers)
          </label>
          <button className="btn btn-navy" disabled={saving || uploading}>{saving ? "Saving…" : editing === "new" ? "Publish story" : "Save changes"}</button>{" "}
          <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
        </form>
      ) : (
        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>All stories ({posts.length})</h2>
            <button className="btn btn-navy" onClick={startNew}>+ New story</button>
          </div>
          <div style={{ marginTop: 14 }}>
            {posts.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>No stories yet — write your first.</p>
            ) : (
              posts.map((p) => (
                <div className="order-card" key={p.id} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <span style={{ fontSize: 30 }}>{p.coverImage ? "🖼️" : p.coverEmoji}</span>
                  <div style={{ flex: 1 }}>
                    <strong>{p.title}</strong> {p.published ? <span className="badge badge-shipped">Published</span> : <span className="badge badge-pending">Draft</span>}
                    <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-body)" }}>{p.category} · {p.author} · {new Date(p.createdAt).toLocaleDateString()}</div>
                  </div>
                  <Link className="btn btn-outline" style={{ padding: "7px 13px" }} href={`/newsletter/${p.slug}`} target="_blank">View</Link>
                  <button className="btn btn-outline" style={{ padding: "7px 13px" }} onClick={() => startEdit(p)}>Edit</button>
                  <button className="btn btn-outline" style={{ padding: "7px 13px" }} onClick={() => togglePublish(p)}>{p.published ? "Unpublish" : "Publish"}</button>
                  <button className="remove" onClick={() => remove(p)}>Delete</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      <p style={{ marginTop: 10, fontSize: 13 }}><Link href="/" className="muted-link">← Back to storefront</Link></p>
    </div>
  );
}
