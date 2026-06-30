"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import ProductCard, { ProductCardData } from "@/components/ProductCard";

type Saved = { id: string; note: string | null; product: ProductCardData };

export default function FavoritesPage() {
  const [saved, setSaved] = useState<Saved[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/account/favorites", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setSaved(d.saved || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="panel">
      <h2>Liked Items</h2>
      <p className="panel-sub">Products you've hearted — add a private note to remember why.</p>
      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      ) : saved.length === 0 ? (
        <div className="empty-state">
          <div className="b">❤️</div>
          <p style={{ marginTop: 12 }}>No liked items yet.</p>
          <Link href="/" className="btn btn-navy" style={{ marginTop: 14 }}>Browse products</Link>
        </div>
      ) : (
        <div className="grid">
          {saved.map((s) => (
            <div key={s.id}>
              <ProductCard p={s.product} />
              <NoteBox productId={s.product.id} initial={s.note} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NoteBox({ productId, initial }: { productId: string; initial: string | null }) {
  const [note, setNote] = useState(initial || "");
  const [saved, setSaved] = useState<"idle" | "saving" | "done">("idle");

  async function save() {
    if (note === (initial || "")) return;
    setSaved("saving");
    await fetch("/api/account/favorites", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, note: note || null }) });
    setSaved("done");
    setTimeout(() => setSaved("idle"), 1500);
  }

  return (
    <div style={{ marginTop: 6 }}>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={save}
        placeholder="📝 Add a note (e.g. gift for Dad, size L)…"
        rows={2}
        style={{ width: "100%", border: "1.5px solid var(--line)", borderRadius: 8, padding: "8px 10px", fontFamily: "var(--font-body)", fontSize: 13, resize: "vertical" }}
      />
      {saved === "saving" && <span style={{ fontSize: 11, color: "var(--muted)" }}>Saving…</span>}
      {saved === "done" && <span style={{ fontSize: 11, color: "var(--green)" }}>✓ Saved</span>}
    </div>
  );
}
