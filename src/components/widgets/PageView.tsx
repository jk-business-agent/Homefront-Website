// Renders all enabled sections of a CMS page in order.
import SectionRenderer, { SectionData } from "./SectionRenderer";
import type { PageCtx } from "@/lib/page-types";

export default function PageView({ sections, ctx }: { sections: SectionData[]; ctx: PageCtx }) {
  return (
    <>
      {sections.map((s) => (
        <SectionRenderer key={s.id} section={s} ctx={ctx} />
      ))}
    </>
  );
}
