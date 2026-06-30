"use client";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";
import { firstImage, cld } from "@/lib/img";

type Item = { id: string; name: string; slug: string; priceCents: number; emoji: string; imageUrls?: string | null; madeInState?: string | null; storeName: string; shipFromState?: string | null };
type Main = Item & { sized: boolean };

function Thumb({ it }: { it: Item }) {
  const img = firstImage(it.imageUrls);
  return img
    // eslint-disable-next-line @next/next/no-img-element
    ? <img className="fbt-thumb" src={cld(img, "f_auto,q_auto,c_fill,w_140,h_140")} alt={it.name} />
    : <span className="fbt-thumb fbt-emoji">{it.emoji}</span>;
}

export default function FrequentlyBoughtTogether({ product }: { product: Main }) {
  const { addItem, openCart } = useCart();
  const [companions, setCompanions] = useState<Item[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch(`/api/products/${product.id}/bundle`, { cache: "no-store" }).then((r) => r.json()).then((d) => {
      const c: Item[] = d.products || [];
      setCompanions(c);
      setChecked(Object.fromEntries([...(product.sized ? [] : [product.id]), ...c.map((x) => x.id)].map((id) => [id, true])));
    });
  }, [product.id, product.sized]);

  if (companions.length === 0) return null;

  const items: Item[] = [...(product.sized ? [] : [product]), ...companions];
  const selected = items.filter((it) => checked[it.id]);
  const total = selected.reduce((s, it) => s + it.priceCents, 0);

  function addAll() {
    for (const it of selected) {
      addItem({ productId: it.id, name: it.name, slug: it.slug, priceCents: it.priceCents, emoji: it.emoji, storeName: it.storeName, madeInState: it.madeInState ?? null, shipFromState: it.shipFromState ?? null });
    }
    openCart();
  }

  return (
    <section className="fbt">
      <div className="section-head"><h2>Frequently bought together</h2></div>
      <div className="fbt-inner">
        <div className="fbt-items">
          {items.map((it, i) => (
            <div className="fbt-item" key={it.id}>
              {i > 0 && <span className="fbt-plus">+</span>}
              <Thumb it={it} />
              <div className="fbt-meta">
                <label style={{ fontSize: 12.5, fontFamily: "var(--font-body)" }}>
                  <input type="checkbox" checked={!!checked[it.id]} onChange={(e) => setChecked((c) => ({ ...c, [it.id]: e.target.checked }))} />{" "}
                  {it.id === product.id ? "This item" : it.name}
                </label>
                <div className="cprice" style={{ fontSize: 13 }}>{formatPrice(it.priceCents)}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="fbt-buy">
          <div style={{ fontFamily: "var(--font-head)", fontSize: 18, color: "var(--navy)" }}>Total: {formatPrice(total)}</div>
          <button className="btn btn-gold" disabled={selected.length === 0} onClick={addAll}>Add {selected.length} to cart</button>
          {product.sized && <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "6px 0 0" }}>Add this item separately (choose a size above).</p>}
        </div>
      </div>
    </section>
  );
}
