// Admin: edit/reorder/activate or delete a category.
//   PATCH  /api/admin/categories/[id] — { name?, active?, sortOrder? }  (renaming also re-tags products)
//   DELETE /api/admin/categories/[id]
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const schema = z.object({
  name: z.string().min(1).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: any = { ...parsed.data };
  if (parsed.data.name && parsed.data.name !== cat.name) {
    data.slug = slugify(parsed.data.name) || cat.slug;
    // Keep products in sync with the renamed category.
    await prisma.product.updateMany({ where: { category: cat.name }, data: { category: parsed.data.name } });
  }
  const updated = await prisma.category.update({ where: { id }, data });
  return NextResponse.json({ category: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const { id } = await params;
  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const inUse = await prisma.product.count({ where: { category: cat.name } });
  if (inUse > 0) return NextResponse.json({ error: `${inUse} product(s) use this category — reassign them first (or hide the category instead).` }, { status: 400 });
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
