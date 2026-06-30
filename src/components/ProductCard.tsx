"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { formatPrice, stars } from "@/lib/format";
import Flag from "./Flag";
import LikeButton from "./LikeButton";
import { responsive, firstImage } from "@/lib/img";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  emoji: string;
  imageUrls?: string | null;
  rating: number;
  reviewCount: number;
  likeCount: number;
  madeInState?: string | null;
  sizes?: string | null;
  store: { name: string; state?: string | null; shipFromState?: string | null };
};

export default function ProductCard({ p }: { p: ProductCardData }) {
  const router = useRouter();
  const { addItem } = useCart();

  function add(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: p.id, name: p.name, slug: p.slug, priceCents: p.priceCents,
      emoji: p.emoji, storeName: p.store.name, madeInState: p.madeInState,
      shipFromState: p.store.shipFromState || p.store.state || p.madeInState,
    });
  }

  const img = firstImage(p.imageUrls);
  const r = img ? responsive(img, { widths: [280, 420, 560], base: 420, square: true }) : null;

  return (
    <Link href={`/products/${p.slug}`} className="card">
      <div className="ph">
        {r ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ph-img" src={r.src} srcSet={r.srcSet} sizes="(max-width: 640px) 90vw, 280px" alt={p.name} loading="lazy" />
        ) : (
          p.emoji
        )}
        {p.madeInState && <div className="madeflag"><Flag size={13} /> {p.madeInState}</div>}
        <div className="card-like" onClick={(e) => e.preventDefault()}>
          <LikeButton productId={p.id} likeCount={p.likeCount} size="sm" />
        </div>
      </div>
      <div className="card-body">
        <div className="seller">{p.store.name}</div>
        <h3>{p.name}</h3>
        <div className="stars">{stars(p.rating)}<span>{p.rating} ({p.reviewCount.toLocaleString()})</span></div>
        <div className="price">{formatPrice(p.priceCents)}</div>
        {p.sizes && p.sizes.trim() ? (
          // Sized items: send to the product page so a size gets chosen.
          <span className="btn btn-navy btn-block add">Select size →</span>
        ) : (
          <button className="btn btn-navy btn-block add" onClick={add}>Add to Cart</button>
        )}
      </div>
    </Link>
  );
}
