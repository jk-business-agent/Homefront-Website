// Full product detail page, fetched by slug from the database.
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatPrice, stars } from "@/lib/format";
import AddToCartButton from "@/components/AddToCartButton";
import LikeButton from "@/components/LikeButton";
import ProductCard, { ProductCardData } from "@/components/ProductCard";
import ReviewSection from "@/components/ReviewSection";
import ViewTracker from "@/components/ViewTracker";
import MessageMakerButton from "@/components/MessageMakerButton";
import QASection from "@/components/QASection";
import FrequentlyBoughtTogether from "@/components/FrequentlyBoughtTogether";
import BackInStockButton from "@/components/BackInStockButton";
import Flag from "@/components/Flag";
import PageView from "@/components/widgets/PageView";
import { getPage } from "@/lib/pages";
import { getSettings } from "@/lib/settings";
import { responsive, cld } from "@/lib/img";
import type { PageCtx } from "@/lib/page-types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.product.findFirst({ where: { OR: [{ slug }, { id: slug }] }, include: { store: { select: { name: true } } } });
  if (!p) return { title: "Product not found" };
  const img = p.imageUrls ? (JSON.parse(p.imageUrls)[0] as string) : undefined;
  const desc = p.description.slice(0, 160);
  return {
    title: p.name,
    description: desc,
    openGraph: { title: p.name, description: desc, type: "website", images: img ? [img] : ["/logo.png"] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    include: { store: true, variants: true },
  });
  if (!product) notFound();
  const sizeStock: Record<string, number> = Object.fromEntries(product.variants.map((v) => [v.size, v.stockQty]));
  if (!product.store.approved || !product.active) notFound(); // suspended seller / hidden listing

  const madeIn = [product.madeInCity, product.madeInState].filter(Boolean).join(", ");
  const sizes = product.sizes ? product.sizes.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const images: string[] = product.imageUrls ? JSON.parse(product.imageUrls) : [];
  const shipping = product.shippingPriceCents === 0 ? "Free U.S. shipping" : `${formatPrice(product.shippingPriceCents)} shipping`;
  const store = product.store;
  const shipsFrom = store.shipFromState || store.state;

  // Shared product-page template (admin-editable in Admin → Design → "Product page").
  const [template, settings] = await Promise.all([getPage("product-template"), getSettings()]);
  const hasTemplate = !!(template && template.published && template.sections.length);
  const productCtx: PageCtx = { category: product.category, search: "", showHero: true, settings, product: { id: product.id, category: product.category, name: product.name } };

  // Fallback "You might also like" used only when no template is configured.
  const related = hasTemplate ? [] : ((await prisma.product.findMany({
    where: { active: true, store: { approved: true }, category: product.category, id: { not: product.id } },
    orderBy: [{ likeCount: "desc" }, { reviewCount: "desc" }],
    take: 4,
    include: { store: { select: { name: true, state: true, shipFromState: true } } },
  })) as unknown as ProductCardData[]);

  // Structured data for rich Google results (price, availability, rating).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    ...(images.length ? { image: images } : {}),
    brand: { "@type": "Brand", name: store.name },
    offers: {
      "@type": "Offer",
      price: (product.priceCents / 100).toFixed(2),
      priceCurrency: "USD",
      availability: product.stockQty > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(product.reviewCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviewCount } } : {}),
  };

  return (
    <div className="page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ViewTracker productId={product.id} />
      <div className="breadcrumb">
        <Link href="/">Home</Link> {" / "}
        <Link href={`/?category=${encodeURIComponent(product.category)}`}>{product.category}</Link> {" / "}
        {product.name}
      </div>

      <div className="pd">
        <div>
          <div className="pd-img">
            {images.length > 0
              // eslint-disable-next-line @next/next/no-img-element
              ? <img className="pd-img-photo" {...responsive(images[0], { widths: [480, 768, 1024], base: 768 })} sizes="(max-width: 860px) 92vw, 480px" alt={product.name} />
              : product.emoji}
          </div>
          {/* Image gallery */}
          <div className="gallery">
            {images.length > 0
              ? images.map((src, i) => <img key={i} src={cld(src, "f_auto,q_auto,c_fill,g_auto,w_160,h_160")} alt="" className="thumb" style={{ objectFit: "cover" }} />)
              : [0, 1, 2].map((i) => <div key={i} className="thumb" title="Photo coming soon">{product.emoji}</div>)}
          </div>
        </div>

        <div className="pd-info">
          <div className="seller"><Link href={`/store/${store.slug}`}>{store.name}</Link></div>
          <h1>{product.name}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div className="stars">{stars(product.rating)}<span>{product.rating} · {product.reviewCount.toLocaleString()} reviews</span></div>
            <LikeButton productId={product.id} likeCount={product.likeCount} size="lg" />
          </div>

          {madeIn && <div className="made-banner"><Flag size={14} /> Verified Made in USA — {madeIn}</div>}
          {shipsFrom && <div className="ships-from">🚚 Ships from {shipsFrom}</div>}

          <div className="mprice">{formatPrice(product.priceCents)} <span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 600 }}>+ {shipping}</span></div>
          <p className="desc">{product.description}</p>

          <ul className="specs">
            <li><span>Sold by</span><b>{store.name}</b></li>
            <li><span>Category</span><b>{product.category}</b></li>
            {madeIn && <li><span>Made in</span><b>{madeIn}</b></li>}
            {product.weightOz != null && <li><span>Shipping weight</span><b>{product.weightOz} oz</b></li>}
            {product.dimensions && <li><span>Dimensions</span><b>{product.dimensions}</b></li>}
            <li><span>Availability</span><b>{product.stockQty > 0 ? `In stock (${product.stockQty})` : "Out of stock"}</b></li>
          </ul>

          {product.stockQty > 0 ? (
            <AddToCartButton
              product={{
                productId: product.id, name: product.name, slug: product.slug,
                priceCents: product.priceCents, emoji: product.emoji,
                storeName: store.name, madeInState: product.madeInState,
                shipFromState: shipsFrom,
              }}
              sizes={sizes}
              sizeStock={sizeStock}
            />
          ) : (
            <BackInStockButton productId={product.id} />
          )}

          {product.safetyInfo && (
            <p style={{ marginTop: 14, fontSize: 13, color: "var(--muted)" }}>
              <strong style={{ color: "var(--navy)" }}>Safety &amp; restrictions:</strong> {product.safetyInfo}
            </p>
          )}
        </div>
      </div>

      <FrequentlyBoughtTogether product={{ id: product.id, name: product.name, slug: product.slug, priceCents: product.priceCents, emoji: product.emoji, imageUrls: product.imageUrls, storeName: store.name, madeInState: product.madeInState, shipFromState: shipsFrom, sized: sizes.length > 0 }} />

      {/* About the maker — brand write-up */}
      <div className="brand-box">
        <div className="bb-head">
          <div className="bb-emblem">🏔️</div>
          <div>
            <h3><Link href={`/store/${store.slug}`} style={{ color: "inherit" }}>About {store.name}</Link></h3>
            <div className="bb-meta">
              {[store.city, store.state].filter(Boolean).join(", ")}
              {store.foundedYear ? ` · Est. ${store.foundedYear}` : ""}
            </div>
          </div>
        </div>
        <p>{store.story || store.bio || `${store.name} is a verified American maker. Every order helps keep U.S. workers employed.`}</p>
        <div className="bb-stats">
          {store.employees != null && <div className="s"><div className="n">{store.employees}</div><div className="l">U.S. employees</div></div>}
          {store.foundedYear != null && <div className="s"><div className="n">{store.foundedYear}</div><div className="l">Founded</div></div>}
          <div className="s"><div className="n">100%</div><div className="l">Made in USA</div></div>
        </div>
        <div style={{ maxWidth: 320, marginTop: 14 }}>
          <MessageMakerButton storeId={store.id} storeName={store.name} productName={product.name} />
        </div>
      </div>

      <ReviewSection productId={product.id} />

      <QASection productId={product.id} storeOwnerId={store.ownerId} />

      {/* Editable shared widgets shown on every product page (includes related products) */}
      {hasTemplate ? (
        <PageView sections={template!.sections} ctx={productCtx} />
      ) : (
        related.length > 0 && (
          <section style={{ marginTop: 34 }}>
            <div className="section-head"><h2>You might also like</h2></div>
            <div className="grid">{related.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          </section>
        )
      )}
    </div>
  );
}
