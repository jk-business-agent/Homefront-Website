// Admin CMS — sections of a page.
//   POST /api/admin/pages/[id]/sections — add a widget {type}
//   PATCH /api/admin/pages/[id]/sections — reorder {orderedIds: string[]}
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getWidget } from "@/lib/widgets";

export const dynamic = "force-dynamic";

const addSchema = z.object({ type: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const { id: pageId } = await params;
  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const def = getWidget(parsed.data.type);
  if (!def) return NextResponse.json({ error: "Unknown widget type" }, { status: 400 });
  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const max = await prisma.section.aggregate({ where: { pageId }, _max: { order: true } });
  const section = await prisma.section.create({
    data: { pageId, type: def.type, order: (max._max.order ?? -1) + 1, config: JSON.stringify(def.defaults) },
  });
  await logAudit(admin, "section.add", `Added "${def.label}" to "${page.title}"`);
  return NextResponse.json({ section }, { status: 201 });
}

const reorderSchema = z.object({ orderedIds: z.array(z.string()) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const { id: pageId } = await params;
  const parsed = reorderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  await prisma.$transaction(
    parsed.data.orderedIds.map((sid, i) =>
      prisma.section.updateMany({ where: { id: sid, pageId }, data: { order: i } }),
    ),
  );
  return NextResponse.json({ ok: true });
}
