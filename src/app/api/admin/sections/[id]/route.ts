// Admin CMS — a single section (widget instance).
//   PATCH  /api/admin/sections/[id] — update {config, enabled}
//   DELETE /api/admin/sections/[id] — remove the widget
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getWidget } from "@/lib/widgets";

export const dynamic = "force-dynamic";

const schema = z.object({
  config: z.record(z.any()).optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const existing = await prisma.section.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: any = {};
  if (parsed.data.enabled !== undefined) data.enabled = parsed.data.enabled;
  if (parsed.data.config !== undefined) {
    // Keep only keys this widget knows about + the universal landingOnly flag.
    const def = getWidget(existing.type);
    // Per-widget fields + universal style keys (background color/image, overlay, text color).
    const allowed = new Set([...(def?.fields.map((f) => f.key) ?? []), "landingOnly", "bgColor", "bgImage", "bgOverlay", "textColor"]);
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(parsed.data.config)) if (allowed.has(k)) clean[k] = v;
    data.config = JSON.stringify(clean);
  }
  const section = await prisma.section.update({ where: { id }, data });
  return NextResponse.json({ section });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const { id } = await params;
  const section = await prisma.section.findUnique({ where: { id } });
  if (!section) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.section.delete({ where: { id } });
  await logAudit(admin, "section.delete", `Removed a ${section.type} widget`);
  return NextResponse.json({ ok: true });
}
