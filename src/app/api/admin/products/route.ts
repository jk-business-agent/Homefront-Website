// GET /api/admin/products — every product across all stores, for admin moderation.
// Optional ?search= to filter by name.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const search = new URL(req.url).searchParams.get("search")?.trim();
  const where = search ? { name: { contains: search } } : {};
  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { store: { select: { name: true } } },
  });
  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id, name: p.name, slug: p.slug, emoji: p.emoji, priceCents: p.priceCents,
      category: p.category, storeName: p.store.name, active: p.active,
      featuredHome: p.featuredHome, featuredCategory: p.featuredCategory, featuredNewsletter: p.featuredNewsletter,
    })),
  });
}
