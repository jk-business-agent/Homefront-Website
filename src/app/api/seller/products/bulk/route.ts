// PATCH /api/seller/products/bulk — update price and/or stock for many of the
// seller's own products in one go. Body: { updates: [{ id, priceCents?, stockQty? }] }.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSeller } from "@/lib/auth";
import { notifyBackInStock } from "@/lib/stock-alerts";

export const dynamic = "force-dynamic";

const schema = z.object({
  updates: z.array(z.object({
    id: z.string(),
    priceCents: z.number().int().min(0).optional(),
    stockQty: z.number().int().min(0).optional(),
  })).min(1).max(500),
});

export async function PATCH(req: NextRequest) {
  let user;
  try { user = await requireSeller(); } catch { return NextResponse.json({ error: "Seller access required" }, { status: 401 }); }
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return NextResponse.json({ error: "No store found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  // Only touch products that actually belong to this store.
  const ids = parsed.data.updates.map((u) => u.id);
  const owned = await prisma.product.findMany({ where: { id: { in: ids }, storeId: store.id }, select: { id: true } });
  const ownedSet = new Set(owned.map((p) => p.id));

  let updated = 0;
  await prisma.$transaction(
    parsed.data.updates
      .filter((u) => ownedSet.has(u.id) && (u.priceCents !== undefined || u.stockQty !== undefined))
      .map((u) => {
        const data: any = {};
        if (u.priceCents !== undefined) data.priceCents = u.priceCents;
        if (u.stockQty !== undefined) data.stockQty = u.stockQty;
        updated++;
        return prisma.product.update({ where: { id: u.id }, data });
      }),
  );

  // Notify waitlists for any products that may have been restocked.
  for (const u of parsed.data.updates) {
    if (ownedSet.has(u.id) && u.stockQty !== undefined && u.stockQty > 0) notifyBackInStock(u.id).catch(() => {});
  }
  return NextResponse.json({ ok: true, updated });
}
