// PATCH /api/seller/products/[id] — a seller edits / restocks their own product.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSeller } from "@/lib/auth";
import { notifyBackInStock } from "@/lib/stock-alerts";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  priceCents: z.number().int().positive().optional(),
  category: z.string().min(1).optional(),
  emoji: z.string().optional(),
  madeInCity: z.string().nullable().optional(),
  madeInState: z.string().min(1).optional(),
  stockQty: z.number().int().nonnegative().optional(),
  weightOz: z.number().int().nonnegative().nullable().optional(),
  shippingPriceCents: z.number().int().nonnegative().optional(),
  dimensions: z.string().nullable().optional(),
  sizes: z.string().nullable().optional(),
  safetyInfo: z.string().nullable().optional(),
  active: z.boolean().optional(),
  variants: z.array(z.object({ size: z.string().min(1), stockQty: z.number().int().nonnegative() })).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await requireSeller(); } catch { return NextResponse.json({ error: "Seller access required" }, { status: 401 }); }
  const { id } = await params;
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return NextResponse.json({ error: "No store found" }, { status: 404 });

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || product.storeId !== store.id) return NextResponse.json({ error: "That product isn't in your store" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { variants, ...data } = parsed.data;

  // If per-size variants are provided, replace them and recompute sizes + total stock.
  if (variants) {
    (data as any).sizes = variants.length ? variants.map((v) => v.size).join(",") : null;
    (data as any).stockQty = variants.reduce((n, v) => n + v.stockQty, 0);
    await prisma.productVariant.deleteMany({ where: { productId: id } });
    if (variants.length) {
      await prisma.productVariant.createMany({ data: variants.map((v) => ({ productId: id, size: v.size, stockQty: v.stockQty })) });
    }
  }

  const updated = await prisma.product.update({ where: { id }, data });
  if (updated.stockQty > 0) notifyBackInStock(id).catch(() => {}); // email anyone waiting
  return NextResponse.json({ product: updated });
}
