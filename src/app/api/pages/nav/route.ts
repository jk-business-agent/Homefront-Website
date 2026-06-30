// GET /api/pages/nav — published CMS pages that opted into the top navigation.
import { NextResponse } from "next/server";
import { getNavPages } from "@/lib/pages";

export const dynamic = "force-dynamic";

export async function GET() {
  const pages = await getNavPages();
  return NextResponse.json({ pages: pages.map((p) => ({ key: p.key, label: p.navLabel || p.title })) });
}
