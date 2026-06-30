// Public storefront page for a single maker: /store/<slug>
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ProductCard, { ProductCardData } from "@/components/ProductCard";
import MessageMakerButton from "@/components/MessageMakerButton";
import Flag from "@/components/Flag";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const store = await prisma.store.findUnique({ where: { slug } });
  if (!store) return { title: "Maker not found" };
  return { title: store.name, description: store.bio || `Shop ${store.name}, a verified American maker.` };
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await prisma.store.findUnique({
    where: { slug },
    include: {
      products: {
        where: { active: true },
        orderBy: [{ featuredHome: "desc" }, { reviewCount: "desc" }],
        include: { store: { select: { name: true, state: true, shipFromState: true } } },
      },
    },
  });
  if (!store || !store.approved) notFound();

  const products = store.products as unknown as ProductCardData[];
  const location = [store.city, store.state].filter(Boolean).join(", ");

  return (
    <div className="page">
      {/* Store banner */}
      <section className="store-hero">
        <div className="store-hero-emblem">🏔️</div>
        <div className="store-hero-body">
          <div className="store-hero-kicker"><Flag size={13} /> Verified American Maker {store.featured && <span className="badge badge-paid" style={{ marginLeft: 8 }}>★ Featured</span>}</div>
          <h1>{store.name}</h1>
          <div className="store-hero-meta">
            {location && <span>📍 {location}</span>}
            {store.foundedYear ? <span>· Est. {store.foundedYear}</span> : null}
            {store.employees != null ? <span>· {store.employees} U.S. employees</span> : null}
            <span>· {products.length} product{products.length !== 1 ? "s" : ""}</span>
          </div>
          {store.bio && <p className="store-hero-bio">{store.bio}</p>}
          <div style={{ maxWidth: 320, marginTop: 14 }}>
            <MessageMakerButton storeId={store.id} storeName={store.name} />
          </div>
        </div>
      </section>

      {/* Maker story */}
      {store.story && (
        <section className="section">
          <div className="panel">
            <h2>Our story</h2>
            <p style={{ fontFamily: "var(--font-body)", color: "#3a3022", fontSize: 15.5, lineHeight: 1.7 }}>{store.story}</p>
          </div>
        </section>
      )}

      {/* Products */}
      <section className="section">
        <div className="section-head"><h2>Shop {store.name}</h2></div>
        {products.length === 0 ? (
          <div className="empty-state"><div className="b">📦</div><p style={{ marginTop: 12 }}>No products listed yet — check back soon.</p></div>
        ) : (
          <div className="grid">{products.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        )}
      </section>

      <p style={{ fontSize: 13 }}><Link href="/vendors" className="muted-link">← All makers</Link></p>
    </div>
  );
}
