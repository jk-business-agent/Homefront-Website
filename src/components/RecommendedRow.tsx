"use client";
import { useEffect, useState } from "react";
import ProductCard, { ProductCardData } from "./ProductCard";
import { useAuth } from "@/lib/auth-context";

// "Recommended for you" — personalized when signed in, popular picks otherwise.
export default function RecommendedRow({ heading }: { heading?: string } = {}) {
  const { user, loading } = useAuth();
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [personalized, setPersonalized] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    fetch("/api/recommendations", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { setProducts(d.products || []); setPersonalized(!!d.personalized); })
      .finally(() => setReady(true));
  }, [loading, user]);

  if (!ready || products.length === 0) return null;

  return (
    <section className="section">
      <div className="section-head">
        <h2>{personalized ? (heading || "✨ Recommended for you") : "✨ Popular picks"}</h2>
        {personalized && <span style={{ fontSize: 13, color: "var(--muted)" }}>Based on what you like &amp; browse</span>}
      </div>
      <div className="grid">
        {products.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}
