"use client";
import { useEffect, useState } from "react";
import ProductCard, { ProductCardData } from "./ProductCard";
import { useAuth } from "@/lib/auth-context";

// "Recently viewed" — the shopper's last-viewed products. Renders nothing when
// signed out or there's no history.
export default function RecentlyViewed({ heading }: { heading?: string }) {
  const { user, loading } = useAuth();
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { setReady(true); return; }
    fetch("/api/account/recently-viewed", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .finally(() => setReady(true));
  }, [user, loading]);

  if (!ready || products.length === 0) return null;

  return (
    <section className="section">
      <div className="section-head"><h2>{heading || "🕘 Recently viewed"}</h2></div>
      <div className="grid">{products.map((p) => <ProductCard key={p.id} p={p} />)}</div>
    </section>
  );
}
