// The newsletter hub: all published stories + a prominent sign-up.
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import NewsletterSignup from "@/components/NewsletterSignup";
import ProductCard, { ProductCardData } from "@/components/ProductCard";
import { beehiivEnabled, beehiivPosts } from "@/lib/beehiiv";

export const dynamic = "force-dynamic";

export default async function NewsletterPage() {
  const [posts, featured, bhPosts] = await Promise.all([
    prisma.post.findMany({ where: { published: true }, orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({ where: { active: true, featuredNewsletter: true, store: { approved: true } }, take: 4, include: { store: { select: { name: true, state: true, shipFromState: true } } } }) as unknown as Promise<ProductCardData[]>,
    beehiivPosts(12),
  ]);
  // When beehiiv is connected and has published issues, show those; otherwise show our own stories.
  const useBeehiiv = beehiivEnabled() && bhPosts.length > 0;

  return (
    <div className="page">
      {/* Hero sign-up */}
      <section className="hero" style={{ padding: 0, marginTop: 0 }}>
        <div className="hero-card">
          <span style={{ fontFamily: "var(--font-head)", letterSpacing: 2, textTransform: "uppercase", color: "var(--amber-soft)", fontSize: 13 }}>
            The Homefront Dispatch
          </span>
          <h1 style={{ marginTop: 10 }}>Stories from the American home front.</h1>
          <p>Maker spotlights, made-in-USA goods, and the people behind them. Join the list — new stories land in your inbox.</p>
          <div style={{ maxWidth: 460, marginTop: 22, position: "relative" }}>
            <NewsletterSignup source="page" buttonLabel="Subscribe" dark />
          </div>
        </div>
      </section>

      {/* Stories — from beehiiv when connected, otherwise our own */}
      <section className="section" style={{ marginTop: 34 }}>
        <div className="section-head"><h2>Latest {useBeehiiv ? "issues" : "stories"}</h2></div>
        {useBeehiiv ? (
          <div className="story-grid">
            {bhPosts.map((p) => (
              <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="story-card">
                <div className={`sc-cover ${p.thumbnail ? "has-img" : ""}`} style={p.thumbnail ? { backgroundImage: `url(${p.thumbnail})` } : undefined}>{p.thumbnail ? "" : "📰"}</div>
                <div className="sc-body">
                  <span className="sc-cat">Newsletter</span>
                  <h3>{p.title}</h3>
                  {p.subtitle && <p>{p.subtitle}</p>}
                  <span className="sc-read">Read issue →</span>
                </div>
              </a>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No stories yet — check back soon.</p>
        ) : (
          <div className="story-grid">
            {posts.map((p) => (
              <Link key={p.id} href={`/newsletter/${p.slug}`} className="story-card">
                <div className={`sc-cover ${p.coverImage ? "has-img" : ""}`} style={p.coverImage ? { backgroundImage: `url(${p.coverImage})` } : undefined}>{p.coverImage ? "" : p.coverEmoji}</div>
                <div className="sc-body">
                  <span className="sc-cat">{p.category}</span>
                  <h3>{p.title}</h3>
                  <p>{p.excerpt}</p>
                  <span className="sc-read">Read story →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {featured.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>⭐ Shop featured American-made</h2></div>
          <div className="grid">{featured.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      )}
    </div>
  );
}
