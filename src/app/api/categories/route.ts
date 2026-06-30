// GET /api/categories — active storefront categories (admin-managed), with product counts.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [cats, grouped] = await Promise.all([
    prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.product.groupBy({ by: ["category"], where: { active: true }, _count: { category: true } }),
  ]);
  const counts = new Map(grouped.map((g) => [g.category, g._count.category]));
  const categories = cats.map((c) => ({ name: c.name, slug: c.slug, count: counts.get(c.name) ?? 0 }));
  return NextResponse.json({ categories });
}
