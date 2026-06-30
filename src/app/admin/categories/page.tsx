"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AdminNav from "@/components/AdminNav";

type Cat = { id: string; name: string; slug: string; sortOrder: number; active: boolean; productCount: number };

export default function AdminCategories() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [cats, setCats] = useState<Cat[]>([]);
  const [newName, setNewName] = useState("");
  const [err, setErr] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/categories", { cache: "no-store" }).then((r) => r.json()).then((d) => setCats(d.categories || []));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login?next=/admin/categories"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
    load();
  }, [user, loading, router, load]);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const res = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName }) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "Could not add"); return; }
    setNewName(""); load();
  }
  async function patch(id: string, body: any) {
    await fetch(`/api/admin/categories/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    load();
  }
  async function saveName(c: Cat) { await patch(c.id, { name: editName }); setEditingId(null); }
  async function move(i: number, dir: -1 | 1) {
    const j = i + dir; if (j < 0 || j >= cats.length) return;
    const a = cats[i], b = cats[j];
    await fetch(`/api/admin/categories/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: b.sortOrder }) });
    await fetch(`/api/admin/categories/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: a.sortOrder }) });
    load();
  }
  async function remove(c: Cat) {
    setErr("");
    const res = await fetch(`/api/admin/categories/${c.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); setErr(d.error || "Could not delete"); return; }
    load();
  }

  if (loading || !user || user.role !== "ADMIN") return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;

  return (
    <div className="page">
      <AdminNav />
      <h1 style={{ color: "var(--navy)", fontSize: 26, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>Categories</h1>
      <p style={{ color: "var(--muted)", marginTop: 0, fontFamily: "var(--font-body)" }}>Add, rename, reorder, or hide the categories shown across the site. Reassign a product's category from its edit page.</p>
      {err && <div className="alert alert-error" style={{ maxWidth: 720 }}>{err}</div>}

      <div className="panel" style={{ maxWidth: 720 }}>
        <form onSubmit={add} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input style={{ flex: 1, border: "1.5px solid var(--line)", borderRadius: 8, padding: "10px 13px", fontFamily: "var(--font-body)" }} placeholder="New category name…" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button className="btn btn-navy">+ Add</button>
        </form>

        {cats.map((c, i) => (
          <div className="order-card" key={c.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <button className="block-ctrls" onClick={() => move(i, -1)} disabled={i === 0} style={{ border: "1px solid var(--line)", background: "#fff", borderRadius: 5, cursor: "pointer", width: 26 }}>↑</button>
              <button onClick={() => move(i, 1)} disabled={i === cats.length - 1} style={{ border: "1px solid var(--line)", background: "#fff", borderRadius: 5, cursor: "pointer", width: 26 }}>↓</button>
            </div>
            <div style={{ flex: 1 }}>
              {editingId === c.id ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ border: "1.5px solid var(--line)", borderRadius: 6, padding: "6px 10px" }} />
                  <button className="btn btn-navy" style={{ padding: "6px 12px" }} onClick={() => saveName(c)}>Save</button>
                  <button className="btn btn-outline" style={{ padding: "6px 12px" }} onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              ) : (
                <>
                  <strong>{c.name}</strong> {c.active ? <span className="badge badge-shipped">Visible</span> : <span className="badge badge-pending">Hidden</span>}
                  <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-body)" }}>{c.productCount} product{c.productCount !== 1 ? "s" : ""}</div>
                </>
              )}
            </div>
            {editingId !== c.id && <>
              <button className="btn btn-outline" style={{ padding: "6px 11px" }} onClick={() => { setEditingId(c.id); setEditName(c.name); }}>Rename</button>
              <button className="btn btn-outline" style={{ padding: "6px 11px" }} onClick={() => patch(c.id, { active: !c.active })}>{c.active ? "Hide" : "Show"}</button>
              <button className="remove" onClick={() => remove(c)}>Delete</button>
            </>}
          </div>
        ))}
      </div>
      <p style={{ marginTop: 10, fontSize: 13 }}><Link href="/" className="muted-link">← Back to storefront</Link></p>
    </div>
  );
}
