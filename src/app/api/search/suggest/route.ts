// GET /api/search/suggest?q= — quick search suggestions (products + matching makers).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ suggestions: [] });

  const [products, stores] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, store: { approved: true }, name: { contains: q } },
      orderBy: { reviewCount: "desc" },
      take: 6,
      select: { name: true, slug: true, emoji: true },
    }),
    prisma.store.findMany({
      where: { approved: true, name: { contains: q } },
      take: 3,
      select: { name: true },
    }),
  ]);

  const suggestions = [
    ...products.map((p) => ({ type: "product" as const, label: p.name, slug: p.slug, emoji: p.emoji })),
    ...stores.map((s) => ({ type: "store" as const, label: s.name })),
  ];
  return NextResponse.json({ suggestions });
}
