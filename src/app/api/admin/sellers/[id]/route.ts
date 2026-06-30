// GET/PATCH /api/admin/sellers/[id] — read or edit a store's full info (admin).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { decryptField } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const { id } = await params;
  const store = await prisma.store.findUnique({ where: { id }, include: { owner: { select: { email: true } }, _count: { select: { products: true } } } });
  if (!store) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Mask the tax ID even for admins (decrypt only to show last 4); surface whether it's on file.
  const { taxId, ...rest } = store;
  const digits = (decryptField(taxId) || "").replace(/\D/g, "");
  return NextResponse.json({ store: { ...rest, taxIdMasked: taxId ? `••• •• ${digits.slice(-4)}` : null, w9OnFile: !!taxId } });
}

const schema = z.object({
  name: z.string().min(1).optional(),
  bio: z.string().nullable().optional(),
  story: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  employees: z.number().int().nonnegative().nullable().optional(),
  foundedYear: z.number().int().min(1700).max(2100).nullable().optional(),
  shipFromLine1: z.string().nullable().optional(),
  shipFromCity: z.string().nullable().optional(),
  shipFromState: z.string().nullable().optional(),
  shipFromZip: z.string().nullable().optional(),
  approved: z.boolean().optional(),
  featured: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  const store = await prisma.store.update({ where: { id }, data: parsed.data }).catch(() => null);
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });
  if (parsed.data.approved !== undefined) await logAudit(admin, parsed.data.approved ? "seller.approve" : "seller.suspend", store.name);
  if (parsed.data.featured !== undefined) await logAudit(admin, parsed.data.featured ? "seller.feature" : "seller.unfeature", store.name);
  return NextResponse.json({ store });
}
