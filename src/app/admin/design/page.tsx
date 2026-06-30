"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AdminNav from "@/components/AdminNav";

type Page = {
  id: string; key: string; title: string; published: boolean; system: boolean;
  showInNav: boolean; navLabel: string | null; navOrder: number; sectionCount: number;
};

export default function AdminDesign() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [title, setTitle] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/pages", { cache: "no-store" }).then((r) => r.json()).then((d) => setPages(d.pages || []));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login?next=/admin/design"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
    load();
  }, [user, loading, router, load]);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    const res = await fetch("/api/admin/pages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
    const data = await res.json(); setBusy(false);
    if (!res.ok) { setErr(data.error || "Could not create page"); return; }
    setTitle(""); router.push(`/admin/design/${data.page.id}`);
  }
  async function patch(id: string, body: any) {
    await fetch(`/api/admin/pages/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    load();
  }
  async function remove(p: Page) {
    if (!confirm(`Delete the page "${p.title}"? This can't be undone.`)) return;
    setErr("");
    const res = await fetch(`/api/admin/pages/${p.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); setErr(d.error || "Could not delete"); return; }
    load();
  }

  if (loading || !user || user.role !== "ADMIN") return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;

  const CLEAN: Record<string, string> = { home: "/", about: "/about", vendors: "/vendors" };
  const liveHref = (p: Page) => CLEAN[p.key] ?? `/p/${p.key}`;
  const isTemplate = (p: Page) => p.key === "product-template";

  return (
    <div className="page">
      <AdminNav />
      <h1 style={{ color: "var(--navy)", fontSize: 26, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>Design Pages</h1>
      <p style={{ color: "var(--muted)", marginTop: 0, fontFamily: "var(--font-body)" }}>
        Build and edit each page of your site from widgets — hero banners, featured products, newsletter signups and more. Changes go live when you publish.
      </p>
      {err && <div className="alert alert-error" style={{ maxWidth: 760 }}>{err}</div>}

      <div className="panel" style={{ maxWidth: 760, marginBottom: 18 }}>
        <h3 style={{ marginTop: 0 }}>➕ New page</h3>
        <form onSubmit={create} style={{ display: "flex", gap: 8 }}>
          <input style={{ flex: 1, border: "1.5px solid var(--line)", borderRadius: 8, padding: "10px 13px", fontFamily: "var(--font-body)" }} placeholder="Page title, e.g. Our Promise" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <button className="btn btn-navy" disabled={busy}>{busy ? "Creating…" : "Create page"}</button>
        </form>
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8, marginBottom: 0 }}>Custom pages live at <code>/p/your-title</code> and can be added to the top menu.</p>
      </div>

      <div className="panel" style={{ maxWidth: 760 }}>
        {pages.map((p) => (
          <div className="order-card" key={p.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 16 }}>{p.title}</strong>{" "}
              {p.system && <span className="badge badge-shipped">Built-in</span>}{" "}
              {p.published ? <span className="badge badge-delivered">Published</span> : <span className="badge badge-pending">Draft</span>}{" "}
              {p.showInNav && <span className="badge" style={{ background: "#eef", color: "#33c" }}>In menu</span>}
              <div style={{ fontSize: 12.5, color: "var(--muted)", fontFamily: "var(--font-body)", marginTop: 3 }}>
                {p.sectionCount} widget{p.sectionCount !== 1 ? "s" : ""} · <code>{isTemplate(p) ? "every product page" : liveHref(p)}</code>
              </div>
            </div>
            <Link className="btn btn-navy" style={{ padding: "7px 13px" }} href={`/admin/design/${p.id}`}>✏️ Edit</Link>
            {!isTemplate(p) && <a className="btn btn-outline" style={{ padding: "7px 11px" }} href={liveHref(p)} target="_blank" rel="noreferrer">View</a>}
            <button className="btn btn-outline" style={{ padding: "7px 11px" }} onClick={() => patch(p.id, { published: !p.published })}>{p.published ? "Unpublish" : "Publish"}</button>
            {!p.system && <button className="remove" onClick={() => remove(p)}>Delete</button>}
          </div>
        ))}
      </div>
      <p style={{ marginTop: 10, fontSize: 13 }}><Link href="/" className="muted-link">← Back to storefront</Link></p>
    </div>
  );
}
