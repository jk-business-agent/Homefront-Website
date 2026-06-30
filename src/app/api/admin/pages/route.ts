// Admin CMS — pages collection.
//   GET  /api/admin/pages — list all pages (with section counts)
//   POST /api/admin/pages — create a new custom page
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const RESERVED = new Set(["home", "p", "api", "admin", "seller", "account", "login", "register", "sell", "about", "vendors", "newsletter", "checkout", "privacy", "terms"]);

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const pages = await prisma.page.findMany({
    orderBy: [{ system: "desc" }, { navOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { sections: true } } },
  });
  return NextResponse.json({ pages: pages.map((p) => ({ ...p, sectionCount: p._count.sections })) });
}

const schema = z.object({ title: z.string().min(1, "Title required"), key: z.string().optional() });

export async function POST(req: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const title = parsed.data.title.trim();
  let key = slugify(parsed.data.key || title);
  if (!key) return NextResponse.json({ error: "Could not make a valid page address from that title" }, { status: 400 });
  if (RESERVED.has(key)) return NextResponse.json({ error: `"${key}" is a reserved address — pick another title.` }, { status: 409 });
  if (await prisma.page.findUnique({ where: { key } })) return NextResponse.json({ error: "A page with that address already exists" }, { status: 409 });

  const max = await prisma.page.aggregate({ _max: { navOrder: true } });
  const page = await prisma.page.create({
    data: { key, title, system: false, published: false, showInNav: false, navOrder: (max._max.navOrder ?? 0) + 1 },
  });
  await logAudit(admin, "page.create", `Created page "${title}" (/p/${key})`);
  return NextResponse.json({ page }, { status: 201 });
}
