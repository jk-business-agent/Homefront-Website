// Admin category management.
//   GET  /api/admin/categories — all categories (with product counts)
//   POST /api/admin/categories — create
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const [cats, grouped] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.product.groupBy({ by: ["category"], _count: { category: true } }),
  ]);
  const counts = new Map(grouped.map((g) => [g.category, g._count.category]));
  return NextResponse.json({ categories: cats.map((c) => ({ ...c, productCount: counts.get(c.name) ?? 0 })) });
}

const schema = z.object({ name: z.string().min(1, "Name required") });

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  const name = parsed.data.name.trim();
  const exists = await prisma.category.findFirst({ where: { name } });
  if (exists) return NextResponse.json({ error: "That category already exists" }, { status: 409 });
  const max = await prisma.category.aggregate({ _max: { sortOrder: true } });
  const cat = await prisma.category.create({ data: { name, slug: slugify(name) || name.toLowerCase(), sortOrder: (max._max.sortOrder ?? 0) + 1 } });
  return NextResponse.json({ category: cat }, { status: 201 });
}
