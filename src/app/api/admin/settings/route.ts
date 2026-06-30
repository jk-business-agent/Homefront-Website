// GET/PATCH /api/admin/settings — read or update site-wide customization.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function ensure() {
  let s = await prisma.siteSettings.findFirst();
  if (!s) s = await prisma.siteSettings.create({ data: { id: "main" } });
  return s;
}

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  return NextResponse.json({ settings: await ensure() });
}

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #d99a3f");
// Accept an ISO/datetime-local string or empty → null
const dateOpt = z.union([z.string(), z.null()]).optional();

const schema = z.object({
  announcement: z.string().optional(),
  announcementEnabled: z.boolean().optional(),
  announcementLink: z.string().nullable().optional(),
  announcementStart: dateOpt,
  announcementEnd: dateOpt,
  heroHeadline: z.string().optional(),
  heroSubtext: z.string().optional(),
  heroCtaText: z.string().optional(),
  accentColor: hex.optional(),
  primaryColor: hex.optional(),
  headingFont: z.string().optional(),
  bodyFont: z.string().optional(),
  footerTagline: z.string().optional(),
  popupEnabled: z.boolean().optional(),
});

function toDate(v: string | null | undefined): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export async function PATCH(req: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  const { announcementStart, announcementEnd, announcementLink, ...rest } = parsed.data;
  const data: any = { ...rest };
  if ("announcementLink" in parsed.data) data.announcementLink = announcementLink || null;
  const ds = toDate(announcementStart); if (ds !== undefined) data.announcementStart = ds;
  const de = toDate(announcementEnd); if (de !== undefined) data.announcementEnd = de;
  const cur = await ensure();
  const s = await prisma.siteSettings.update({ where: { id: cur.id }, data });
  await logAudit(admin, "settings.update", Object.keys(parsed.data).join(", "));
  return NextResponse.json({ settings: s });
}
