"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AdminNav from "@/components/AdminNav";
import { stars } from "@/lib/format";

type R = { id: string; rating: number; title: string | null; body: string; authorName: string; hidden: boolean; createdAt: string; productName: string; productSlug: string };

export default function AdminReviews() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [reviews, setReviews] = useState<R[]>([]);
  const [filter, setFilter] = useState<"all" | "visible" | "hidden">("all");

  const load = useCallback((f = "all") => {
    fetch(`/api/admin/reviews${f !== "all" ? `?filter=${f}` : ""}`, { cache: "no-store" }).then((r) => r.json()).then((d) => setReviews(d.reviews || []));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login?next=/admin/reviews"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
    load(filter);
  }, [user, loading, router, load, filter]);

  async function setHidden(id: string, hidden: boolean) {
    await fetch(`/api/admin/reviews/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hidden }) });
    load(filter);
  }
  async function remove(id: string) {
    if (!confirm("Permanently delete this review? (Hiding is reversible; deleting is not.)")) return;
    await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    load(filter);
  }

  if (loading || !user || user.role !== "ADMIN") return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;

  return (
    <div className="page">
      <AdminNav />
      <h1 style={{ color: "var(--navy)", fontSize: 26, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>Review Moderation</h1>
      <p style={{ color: "var(--muted)", marginTop: 0, fontFamily: "var(--font-body)" }}>Hide abusive or fake reviews (reversible) or delete them. Hidden reviews don't show and don't count toward a product's rating.</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {(["all", "visible", "hidden"] as const).map((f) => (
          <button key={f} className={`btn ${filter === f ? "btn-navy" : "btn-outline"}`} style={{ padding: "6px 13px", textTransform: "capitalize" }} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      <div className="panel">
        {reviews.length === 0 && <p style={{ color: "var(--muted)" }}>No reviews here.</p>}
        {reviews.map((r) => (
          <div className="order-card" key={r.id} style={{ opacity: r.hidden ? 0.6 : 1 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5 }}>
                  <span className="stars">{stars(r.rating)}</span>{" "}
                  <strong>{r.title || "(no title)"}</strong>{" "}
                  {r.hidden && <span className="badge badge-pending" style={{ marginLeft: 6 }}>Hidden</span>}
                </div>
                <p style={{ fontFamily: "var(--font-body)", color: "#3a3022", margin: "4px 0", fontSize: 14 }}>{r.body}</p>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  by {r.authorName} · on <Link href={`/products/${r.productSlug}`} className="muted-link">{r.productName}</Link> · {new Date(r.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button className="btn btn-outline" style={{ padding: "6px 11px" }} onClick={() => setHidden(r.id, !r.hidden)}>{r.hidden ? "Unhide" : "Hide"}</button>
              <button className="remove" onClick={() => remove(r.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 10, fontSize: 13 }}><Link href="/admin" className="muted-link">← Back to dashboard</Link></p>
    </div>
  );
}
