// Admin CMS — a single page.
//   GET    /api/admin/pages/[id] — page + ordered sections
//   PATCH  /api/admin/pages/[id] — update page meta / publish / nav
//   DELETE /api/admin/pages/[id] — delete (non-system only)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const { id } = await params;
  const page = await prisma.page.findUnique({ where: { id }, include: { sections: { orderBy: { order: "asc" } } } });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ page });
}

const schema = z.object({
  title: z.string().min(1).optional(),
  published: z.boolean().optional(),
  showInNav: z.boolean().optional(),
  navLabel: z.string().nullable().optional(),
  navOrder: z.number().int().optional(),
  metaDescription: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const page = await prisma.page.update({ where: { id }, data: parsed.data });
  await logAudit(admin, "page.update", `Updated page "${page.title}"`);
  return NextResponse.json({ page });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const { id } = await params;
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (page.system) return NextResponse.json({ error: "Built-in pages can't be deleted (you can unpublish instead)." }, { status: 409 });
  await prisma.page.delete({ where: { id } }); // sections cascade
  await logAudit(admin, "page.delete", `Deleted page "${page.title}"`);
  return NextResponse.json({ ok: true });
}
