// POST /api/shipping/quote — estimate shipping options for a cart + destination.
// Body: { items: [{ productId, quantity }], zip }
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { quoteShipping } from "@/lib/shipping";

export const dynamic = "force-dynamic";

const schema = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1),
  zip: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { items, zip = "" } = parsed.data;

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    select: { id: true, weightOz: true },
  });
  const weightById = new Map(products.map((p) => [p.id, p.weightOz ?? 16]));
  const totalOz = items.reduce((sum, i) => sum + (weightById.get(i.productId) ?? 16) * i.quantity, 0);

  const options = quoteShipping(totalOz, zip);
  return NextResponse.json({ options, totalWeightOz: totalOz, estimate: true });
}
