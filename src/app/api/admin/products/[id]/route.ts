// GET/PATCH /api/admin/products/[id] — read or edit a product's full info (admin).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, include: { store: { select: { name: true } } } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ product });
}

const schema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  priceCents: z.number().int().positive().optional(),
  category: z.string().min(1).optional(),
  emoji: z.string().optional(),
  madeInCity: z.string().nullable().optional(),
  madeInState: z.string().nullable().optional(),
  stockQty: z.number().int().nonnegative().optional(),
  weightOz: z.number().int().nonnegative().nullable().optional(),
  shippingPriceCents: z.number().int().nonnegative().optional(),
  dimensions: z.string().nullable().optional(),
  sizes: z.string().nullable().optional(),
  safetyInfo: z.string().nullable().optional(),
  active: z.boolean().optional(),
  featuredHome: z.boolean().optional(),
  featuredCategory: z.boolean().optional(),
  featuredNewsletter: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  const product = await prisma.product.update({ where: { id }, data: parsed.data }).catch(() => null);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  if (parsed.data.active !== undefined) await logAudit(admin, parsed.data.active ? "product.show" : "product.hide", product.name);
  return NextResponse.json({ product });
}
