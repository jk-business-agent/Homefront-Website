// Server-rendered widget components for the page builder. Each takes a merged
// `cfg` (defaults + saved config) and the page `ctx`. Data-fetching widgets query
// Prisma directly. Add a new widget here + an entry in lib/widgets.ts.
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProductCard, { ProductCardData } from "@/components/ProductCard";
import NewsletterSignup from "@/components/NewsletterSignup";
import SmsSignup from "@/components/SmsSignup";
import RecommendedRow from "@/components/RecommendedRow";
import RecentlyViewed from "@/components/RecentlyViewed";
import FilterBar from "@/components/FilterBar";
import type { PageCtx } from "@/lib/page-types";

const storeInclude = { store: { select: { name: true, state: true, shipFromState: true } } };

async function fetchProducts(source: string, category: string, count: number): Promise<ProductCardData[]> {
  const base: any = { active: true, store: { approved: true } };
  let where: any = base;
  let orderBy: any = { reviewCount: "desc" };
  if (source === "featured_home") where = { ...base, featuredHome: true };
  else if (source === "most_liked") orderBy = { likeCount: "desc" };
  else if (source === "newest") orderBy = { createdAt: "desc" };
  else if (source === "top_rated") orderBy = { rating: "desc" };
  else if (source === "category") where = { ...base, category };
  return prisma.product.findMany({ where, orderBy, take: Math.max(1, Math.min(12, count || 4)), include: storeInclude }) as unknown as ProductCardData[];
}

export async function HeroWidget({ cfg }: { cfg: any }) {
  return (
    <section className="hero">
      <div className="hero-card">
        <h1>{cfg.headline}</h1>
        <p>{cfg.subtext}</p>
        <div className="btns">
          {cfg.ctaText && <a href={cfg.ctaHref || "#shop"} className="btn btn-gold">{cfg.ctaText}</a>}
          {cfg.secondaryText && <Link href={cfg.secondaryHref || "/sell"} className="btn btn-ghost">{cfg.secondaryText}</Link>}
        </div>
        {cfg.showBadges && (
          <div className="hero-badges">
            <div className="hero-badge"><span className="b">✅</span> 100% Made-in-USA verified</div>
            <div className="hero-badge"><span className="b">🚚</span> Ships from American warehouses</div>
            <div className="hero-badge"><span className="b">🤝</span> Keep America working</div>
          </div>
        )}
      </div>
    </section>
  );
}

export function PromoStripWidget({ cfg }: { cfg: any }) {
  return (
    <section className="promo-strip" style={{ background: cfg.bg || "#1f3a5f" }}>
      <div className="promo-strip-inner">
        <span>{cfg.text}</span>
        {cfg.linkText && <Link href={cfg.linkHref || "#"} className="promo-link">{cfg.linkText} →</Link>}
      </div>
    </section>
  );
}

export function NewsletterFeatureWidget({ cfg }: { cfg: any }) {
  return (
    <section className="news-feature">
      <div className="news-feature-inner">
        <div className="nf-left">
          <span className="nf-kicker">{cfg.kicker}</span>
          <h2>{cfg.headline}</h2>
          <p>{cfg.text}</p>
          <div className="nf-form"><NewsletterSignup source="page" buttonLabel={cfg.buttonLabel || "Subscribe free"} dark /></div>
        </div>
        <Link href="/newsletter" className="nf-right">
          <span className="nf-badge">Latest issue</span>
          <span className="nf-emoji">🏔️</span>
          <span className="nf-cta">Read this week's stories →</span>
        </Link>
      </div>
    </section>
  );
}

export function NewsletterSignupWidget({ cfg }: { cfg: any }) {
  return (
    <section className="section">
      <div className="panel" style={{ textAlign: "center" }}>
        {cfg.heading && <h2 style={{ marginBottom: 12 }}>{cfg.heading}</h2>}
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <NewsletterSignup source="page" buttonLabel={cfg.buttonLabel || "Subscribe"} />
        </div>
      </div>
    </section>
  );
}

export function NewsletterHeroWidget({ cfg }: { cfg: any }) {
  const perks = [cfg.perk1, cfg.perk2, cfg.perk3].filter(Boolean);
  return (
    <section className="nl-hero">
      <div className="nl-hero-inner">
        {cfg.kicker && <span className="nl-hero-kicker">{cfg.kicker}</span>}
        <h1>{cfg.headline}</h1>
        {cfg.subtext && <p className="nl-hero-sub">{cfg.subtext}</p>}
        <div className="nl-hero-form">
          <NewsletterSignup source="page" buttonLabel={cfg.buttonLabel || "Subscribe free"} />
        </div>
        {perks.length > 0 && (
          <ul className="nl-hero-perks">
            {perks.map((p: string, i: number) => <li key={i}>✓ {p}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}

export function SmsOptInWidget({ cfg }: { cfg: any }) {
  const perks = [cfg.perk1, cfg.perk2, cfg.perk3].filter(Boolean);
  return (
    <section className="nl-hero">
      <div className="nl-hero-inner">
        {cfg.kicker && <span className="nl-hero-kicker">{cfg.kicker}</span>}
        <h1>{cfg.headline}</h1>
        {cfg.subtext && <p className="nl-hero-sub">{cfg.subtext}</p>}
        <div className="nl-hero-form"><SmsSignup source="landing" buttonLabel={cfg.buttonLabel || "Text me deals"} /></div>
        {perks.length > 0 && <ul className="nl-hero-perks">{perks.map((p: string, i: number) => <li key={i}>✓ {p}</li>)}</ul>}
      </div>
    </section>
  );
}

export async function FeaturedProductsWidget({ cfg }: { cfg: any }) {
  const products = await fetchProducts(cfg.source, cfg.category, Number(cfg.count));
  if (!products.length) return null;
  return (
    <section className="section">
      <div className="section-head">
        <h2>{cfg.heading}</h2>
        {cfg.seeAllText && cfg.seeAllHref && <Link href={cfg.seeAllHref} className="link">{cfg.seeAllText} →</Link>}
      </div>
      <div className="grid">{products.map((p) => <ProductCard key={p.id} p={p} />)}</div>
    </section>
  );
}

export function RecommendedWidget({ cfg }: { cfg: any }) {
  return <RecommendedRow heading={cfg.heading} />;
}

export function RecentlyViewedWidget({ cfg }: { cfg: any }) {
  return <RecentlyViewed heading={cfg.heading} />;
}

export async function StoryStripWidget({ cfg }: { cfg: any }) {
  const stories = await prisma.post.findMany({
    where: { published: true }, orderBy: { createdAt: "desc" }, take: Math.max(1, Math.min(6, Number(cfg.count) || 3)),
    select: { id: true, title: true, slug: true, excerpt: true, coverEmoji: true, coverImage: true, category: true },
  });
  if (!stories.length) return null;
  return (
    <section className="news-strip">
      <div className="news-strip-inner">
        <div className="section-head" style={{ border: "none" }}>
          <div>
            <h2>{cfg.heading}</h2>
            <p className="ns-sub">{cfg.subtext}</p>
          </div>
          <Link href="/newsletter" className="btn btn-gold">{cfg.buttonLabel || "Read the newsletter"}</Link>
        </div>
        <div className="story-grid">
          {stories.map((s) => (
            <Link key={s.id} href={`/newsletter/${s.slug}`} className="story-card">
              <div className={`sc-cover ${s.coverImage ? "has-img" : ""}`} style={s.coverImage ? { backgroundImage: `url(${s.coverImage})` } : undefined}>{s.coverImage ? "" : s.coverEmoji}</div>
              <div className="sc-body">
                <span className="sc-cat">{s.category}</span>
                <h3>{s.title}</h3>
                <p>{s.excerpt}</p>
                <span className="sc-read">Read story →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export async function CategoryChipsWidget({ cfg, ctx }: { cfg: any; ctx: PageCtx }) {
  const activeCats = await prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { name: true } });
  const catNames = ["All", ...activeCats.map((c) => c.name)];
  return (
    <section className="section" id="shop">
      <div className="section-head"><h2>{cfg.heading}</h2></div>
      <div className="chips">
        {catNames.map((c) => {
          const active = c === ctx.category && !ctx.search;
          const href = c === "All" ? "/" : `/?category=${encodeURIComponent(c)}`;
          return <Link key={c} href={href} className={`chip ${active ? "active" : ""}`}>{c}</Link>;
        })}
      </div>
    </section>
  );
}

export async function ShopGridWidget({ cfg, ctx }: { cfg: any; ctx: PageCtx }) {
  const { category, search, sort, minPrice, maxPrice } = ctx;
  const where: any = { active: true, store: { approved: true } };
  if (category && category !== "All") where.category = category;
  const min = Number(minPrice), max = Number(maxPrice);
  if (minPrice && !Number.isNaN(min)) where.priceCents = { ...(where.priceCents || {}), gte: Math.round(min * 100) };
  if (maxPrice && !Number.isNaN(max)) where.priceCents = { ...(where.priceCents || {}), lte: Math.round(max * 100) };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
      { madeInState: { contains: search } },
      { store: { is: { name: { contains: search } } } },
    ];
  }
  const orderBy =
    sort === "most_liked" ? { likeCount: "desc" as const } :
    sort === "price_asc" ? { priceCents: "asc" as const } :
    sort === "price_desc" ? { priceCents: "desc" as const } :
    sort === "rating" ? { rating: "desc" as const } :
    { reviewCount: "desc" as const };

  const products = (await prisma.product.findMany({ where, orderBy, include: storeInclude })) as unknown as ProductCardData[];

  // "Featured in {category}" row when browsing a specific category.
  const categoryFeatured = category !== "All" && !search
    ? (await prisma.product.findMany({ where: { active: true, featuredCategory: true, category, store: { approved: true } }, take: 4, include: storeInclude }) as unknown as ProductCardData[])
    : [];

  const title = search ? `Results for “${search}”` : category === "All" ? (cfg.heading || "Products") : category;

  return (
    <>
      {categoryFeatured.length > 0 && (
        <section className="section" style={{ marginTop: 8 }}>
          <div className="section-head"><h2>⭐ Featured in {category}</h2></div>
          <div className="grid">{categoryFeatured.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      )}
      <section className="section" id="shop" style={{ marginTop: 8 }}>
        <div className="section-head">
          <h2>{title}</h2>
          <span style={{ fontSize: 14, color: "var(--muted)" }}>{products.length} product{products.length !== 1 ? "s" : ""}</span>
        </div>
        {cfg.showFilters && <FilterBar />}
        {products.length === 0 ? (
          <div className="empty-state">
            <div className="b">🔍</div>
            <p style={{ marginTop: 12 }}>No products match yet. Try another category or search.</p>
            <Link href="/" className="btn btn-outline" style={{ marginTop: 14 }}>Back to all products</Link>
          </div>
        ) : (
          <div className="grid">{products.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        )}
      </section>
    </>
  );
}

export function RichTextWidget({ cfg }: { cfg: any }) {
  if (!cfg.heading && !cfg.body) return null;
  return (
    <section className="section" style={{ textAlign: cfg.align === "center" ? "center" : "left" }}>
      <div className="panel">
        {cfg.heading && <h2>{cfg.heading}</h2>}
        {cfg.body && cfg.body.split("\n").filter(Boolean).map((para: string, i: number) => (
          <p key={i} style={{ fontFamily: "var(--font-body)", color: "#3a3022", fontSize: 15.5, lineHeight: 1.7 }}>{para}</p>
        ))}
      </div>
    </section>
  );
}

export function ImageTextWidget({ cfg }: { cfg: any }) {
  const img = (
    <div className="img-ph" style={cfg.imageUrl ? { backgroundImage: `url(${cfg.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center", minHeight: 260 } : { minHeight: 260 }}>
      {cfg.imageUrl ? "" : "Image coming soon"}
    </div>
  );
  return (
    <section className="section">
      <div className="panel" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "center" }}>
        {cfg.imageSide === "left" && img}
        <div>
          {cfg.heading && <h2>{cfg.heading}</h2>}
          {cfg.body && cfg.body.split("\n").filter(Boolean).map((para: string, i: number) => (
            <p key={i} style={{ fontFamily: "var(--font-body)", color: "#3a3022", fontSize: 15.5, lineHeight: 1.7 }}>{para}</p>
          ))}
          {cfg.ctaText && <Link href={cfg.ctaHref || "/"} className="btn btn-navy" style={{ marginTop: 8 }}>{cfg.ctaText}</Link>}
        </div>
        {cfg.imageSide !== "left" && img}
      </div>
    </section>
  );
}

export async function RelatedProductsWidget({ cfg, ctx }: { cfg: any; ctx: PageCtx }) {
  if (!ctx.product) return null; // only meaningful on a product page
  const related = (await prisma.product.findMany({
    where: { active: true, store: { approved: true }, category: ctx.product.category, id: { not: ctx.product.id } },
    orderBy: [{ likeCount: "desc" }, { reviewCount: "desc" }],
    take: Math.max(1, Math.min(8, Number(cfg.count) || 4)),
    include: storeInclude,
  })) as unknown as ProductCardData[];
  if (!related.length) return null;
  return (
    <section className="section" style={{ marginTop: 34 }}>
      <div className="section-head"><h2>{cfg.heading}</h2></div>
      <div className="grid">{related.map((p) => <ProductCard key={p.id} p={p} />)}</div>
    </section>
  );
}

export function PageHeaderWidget({ cfg }: { cfg: any }) {
  return (
    <section className="about-hero">
      <h1>{cfg.heading}</h1>
      {cfg.subtext && <p>{cfg.subtext}</p>}
    </section>
  );
}

export function FeatureCardsWidget({ cfg }: { cfg: any }) {
  const cards = String(cfg.cards || "")
    .split("\n")
    .map((line: string) => line.split("|").map((s) => s.trim()))
    .filter((parts: string[]) => parts.length >= 2 && (parts[1] || parts[0]));
  if (!cards.length) return null;
  return (
    <>
      {cfg.heading && <div className="section-head" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}><h2>{cfg.heading}</h2></div>}
      <div className="about-grid">
        {cards.map((c: string[], i: number) => (
          <div className="about-card" key={i}>
            <div className="b">{c[0]}</div>
            <h3>{c[1]}</h3>
            {c[2] && <p>{c[2]}</p>}
          </div>
        ))}
      </div>
    </>
  );
}

export async function VendorsListWidget({ cfg }: { cfg: any }) {
  const stores = await prisma.store.findMany({
    where: { approved: true },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return (
    <>
      {cfg.heading && <div className="section-head" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}><h2>{cfg.heading}</h2></div>}
      <div className="vendor-grid" style={{ marginTop: 24 }}>
        {stores.map((s) => (
          <div className="vendor-card" id={s.slug} key={s.id}>
            <div className="vc-banner">{s.name}</div>
            <div className="vc-body">
              <div className="vc-loc">📍 {[s.city, s.state].filter(Boolean).join(", ") || "USA"} {s.featured && <span className="badge badge-paid" style={{ marginLeft: 6 }}>★ Featured</span>}</div>
              <p>{s.bio || "A verified American maker on Homefront Markets."}</p>
              <div className="vc-meta">
                {s._count.products} product{s._count.products !== 1 ? "s" : ""}
                {s.employees != null ? ` · ${s.employees} U.S. employees` : ""}
                {s.foundedYear ? ` · Est. ${s.foundedYear}` : ""}
              </div>
              <Link href={`/store/${s.slug}`} className="btn btn-outline" style={{ marginTop: 12 }}>Visit {s.name}</Link>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function TrustBadgesWidget({ cfg }: { cfg: any }) {
  return (
    <div className="trust">
      <div className="trust-inner">
        <div className="trust-item"><div className="b">🔎</div><h4>Verified Made in USA</h4><p>Every seller certifies U.S. origin before listing.</p></div>
        <div className="trust-item"><div className="b">🏭</div><h4>Direct from makers</h4><p>Buy straight from American factories &amp; family shops.</p></div>
        <div className="trust-item"><div className="b">🔒</div><h4>Secure checkout</h4><p>Protected accounts &amp; buyer guarantee.</p></div>
        <div className="trust-item"><div className="b">🇺🇸</div><h4>Keep America working</h4><p>Every order supports U.S. jobs and communities.</p></div>
      </div>
    </div>
  );
}
