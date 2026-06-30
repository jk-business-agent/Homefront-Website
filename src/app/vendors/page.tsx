// Vendors — now rendered from the CMS "vendors" page (editable in Admin → Design).
import PageView from "@/components/widgets/PageView";
import { VendorsListWidget } from "@/components/widgets/Widgets";
import { getPage } from "@/lib/pages";
import { getSettings } from "@/lib/settings";
import type { PageCtx } from "@/lib/page-types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vendors" };

export default async function VendorsPage() {
  const [page, settings] = await Promise.all([getPage("vendors"), getSettings()]);
  const ctx: PageCtx = { category: "All", search: "", showHero: true, settings };

  if (page && page.published && page.sections.length) {
    return <div className="page"><PageView sections={page.sections} ctx={ctx} /></div>;
  }

  // Fallback if the CMS page is missing.
  return (
    <div className="page">
      <section className="about-hero" style={{ padding: "40px 40px" }}>
        <h1>Meet the Makers</h1>
        <p>The American businesses behind every product on Homefront Markets.</p>
      </section>
      {/* @ts-expect-error Async Server Component */}
      <VendorsListWidget cfg={{}} />
    </div>
  );
}
