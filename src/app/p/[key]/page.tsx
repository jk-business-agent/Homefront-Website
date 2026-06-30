// Renders any custom CMS page at /p/<key>.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PageView from "@/components/widgets/PageView";
import { getPage } from "@/lib/pages";
import { getSettings } from "@/lib/settings";
import type { PageCtx } from "@/lib/page-types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  const page = await getPage(key);
  if (!page) return { title: "Not found" };
  return { title: page.title, description: page.metaDescription || undefined };
}

export default async function CustomPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  // These have their own clean-URL routes (or aren't real pages).
  if (["home", "product-template", "about", "vendors"].includes(key)) notFound();
  const page = await getPage(key);
  if (!page || !page.published) notFound();

  const settings = await getSettings();
  const ctx: PageCtx = { category: "All", search: "", showHero: true, settings };

  return (
    <div className="page">
      {page.sections.length === 0 ? (
        <section className="section"><div className="panel"><h1>{page.title}</h1><p style={{ color: "var(--muted)" }}>This page has no content yet.</p></div></section>
      ) : (
        <PageView sections={page.sections} ctx={ctx} />
      )}
    </div>
  );
}
