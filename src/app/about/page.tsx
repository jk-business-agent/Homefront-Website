// About Us — now rendered from the CMS "about" page (editable in Admin → Design).
import Link from "next/link";
import PageView from "@/components/widgets/PageView";
import { getPage } from "@/lib/pages";
import { getSettings } from "@/lib/settings";
import type { PageCtx } from "@/lib/page-types";

export const dynamic = "force-dynamic";
export const metadata = { title: "About" };

export default async function AboutPage() {
  const [page, settings] = await Promise.all([getPage("about"), getSettings()]);
  const ctx: PageCtx = { category: "All", search: "", showHero: true, settings };

  if (page && page.published && page.sections.length) {
    return <div className="page"><PageView sections={page.sections} ctx={ctx} /></div>;
  }

  // Fallback if the CMS page is missing.
  return (
    <div className="page">
      <section className="about-hero">
        <h1>Keep America Working.</h1>
        <p>Homefront Markets exists to make it easy to buy high-quality American-made goods and keep U.S. workers, farms, and family shops thriving.</p>
      </section>
      <Link href="/" className="btn btn-navy" style={{ marginTop: 8 }}>Start shopping</Link>
    </div>
  );
}
