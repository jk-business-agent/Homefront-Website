// The storefront homepage — now rendered from the CMS "home" page (admin-editable
// in Admin → Design). Falls back to a basic product grid if no home page exists.
import Link from "next/link";
import ProductCard, { ProductCardData } from "@/components/ProductCard";
import FilterBar from "@/components/FilterBar";
import PageView from "@/components/widgets/PageView";
import { prisma } from "@/lib/prisma";
import { getPage } from "@/lib/pages";
import { getSettings } from "@/lib/settings";
import type { PageCtx } from "@/lib/page-types";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string; sort?: string; minPrice?: string; maxPrice?: string }>;
}) {
  const { category = "All", search = "", sort, minPrice, maxPrice } = await searchParams;
  const settings = await getSettings();
  const showHero = category === "All" && !search;

  const ctx: PageCtx = { category, search, sort, minPrice, maxPrice, showHero, settings };

  const page = await getPage("home");
  if (page && page.published && page.sections.length) {
    return <PageView sections={page.sections} ctx={ctx} />;
  }

  // ---- Fallback: render a plain filtered grid if the CMS home page is missing ----
  const where: any = { active: true, store: { approved: true } };
  if (category && category !== "All") where.category = category;
  if (search) where.OR = [{ name: { contains: search } }, { description: { contains: search } }];
  const products = (await prisma.product.findMany({ where, orderBy: { reviewCount: "desc" }, include: { store: { select: { name: true, state: true, shipFromState: true } } } })) as unknown as ProductCardData[];
  return (
    <section className="section" id="shop">
      <div className="section-head"><h2>{search ? `Results for “${search}”` : "American-made products"}</h2></div>
      <FilterBar />
      {products.length === 0 ? (
        <div className="empty-state"><div className="b">🔍</div><p style={{ marginTop: 12 }}>No products match yet.</p><Link href="/" className="btn btn-outline" style={{ marginTop: 14 }}>Back to all products</Link></div>
      ) : (
        <div className="grid">{products.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      )}
    </section>
  );
}
