// A single newsletter story.
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import NewsletterSignup from "@/components/NewsletterSignup";
import { parseBlocks } from "@/lib/post-blocks";

export const dynamic = "force-dynamic";

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.post.findFirst({ where: { slug, published: true } });
  if (!post) notFound();

  const blocks = parseBlocks(post.blocks);
  const paragraphs = post.body.split("\n").filter((p) => p.trim().length > 0);

  // Fetch any products embedded in the article.
  const productIds = blocks.filter((b) => b.type === "product").map((b: any) => b.productId).filter(Boolean);
  const blockProducts = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, slug: true, emoji: true, priceCents: true } })
    : [];
  const productMap = new Map(blockProducts.map((p) => [p.id, p]));
  const money = (c: number) => `$${(c / 100).toFixed(2)}`;

  return (
    <div className="page">
      <div className="breadcrumb" style={{ maxWidth: 760, margin: "0 auto 18px" }}>
        <Link href="/newsletter">← The Homefront Dispatch</Link>
      </div>

      <article className="article">
        <div className={`article-cover ${post.coverImage ? "has-img" : ""}`} style={post.coverImage ? { backgroundImage: `url(${post.coverImage})` } : undefined}>{post.coverImage ? "" : post.coverEmoji}</div>
        <div className="article-inner">
          <span className="a-cat">{post.category}</span>
          <h1>{post.title}</h1>
          <div className="a-meta">
            By {post.author} · {new Date(post.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
          {blocks.length > 0
            ? blocks.map((b, i) => {
                if (b.type === "heading") return <h2 key={i} className="a-heading">{b.value}</h2>;
                if (b.type === "image") return (
                  <figure key={i} className="a-figure">
                    <img src={b.url} alt={b.caption || ""} />
                    {b.caption && <figcaption>{b.caption}</figcaption>}
                  </figure>
                );
                if (b.type === "quote") return (
                  <blockquote key={i} className="a-quote">
                    <p>{b.value}</p>
                    {b.attribution && <cite>— {b.attribution}</cite>}
                  </blockquote>
                );
                if (b.type === "button") return (
                  <div key={i} style={{ textAlign: "center", margin: "20px 0" }}>
                    <Link href={b.href || "/"} className="btn btn-red">{b.label || "Shop now"}</Link>
                  </div>
                );
                if (b.type === "product") {
                  const p = productMap.get(b.productId);
                  if (!p) return null;
                  return (
                    <Link key={i} href={`/products/${p.slug}`} className="a-product">
                      <span className="ap-emoji">{p.emoji}</span>
                      <span className="ap-info"><span className="ap-name">{p.name}</span><span className="ap-price">{money(p.priceCents)}</span></span>
                      <span className="ap-cta">Shop →</span>
                    </Link>
                  );
                }
                return <p key={i}>{b.value}</p>;
              })
            : paragraphs.map((p, i) => <p key={i}>{p}</p>)}

          <div style={{ borderTop: "1px solid var(--line)", marginTop: 26, paddingTop: 22 }}>
            <h3 style={{ color: "var(--navy)", textTransform: "uppercase", letterSpacing: ".3px", marginTop: 0 }}>Get the next one</h3>
            <p style={{ fontFamily: "var(--font-body)", color: "var(--muted)", marginTop: 4, marginBottom: 14 }}>
              Join the list for the next maker story and new American-made drops.
            </p>
            <NewsletterSignup source="page" buttonLabel="Subscribe" />
          </div>
        </div>
      </article>
    </div>
  );
}
