// GET /api/products/[id]/bundle — "frequently bought together" companions.
// Uses real co-purchase history, falling back to popular items in the same category.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const select = {
  id: true, name: true, slug: true, priceCents: true, emoji: true, imageUrls: true, sizes: true, madeInState: true,
  store: { select: { name: true, state: true, shipFromState: true } },
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = await params;
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { category: true } });
  if (!product) return NextResponse.json({ products: [] });

  // Orders that included this product → the other products in those orders.
  const myItems = await prisma.orderItem.findMany({ where: { productId }, select: { orderId: true } });
  const orderIds = [...new Set(myItems.map((i) => i.orderId))];

  let companionIds: string[] = [];
  if (orderIds.length) {
    const grouped = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: { orderId: { in: orderIds }, productId: { not: productId } },
      _count: { productId: true },
      orderBy: { _count: { productId: "desc" } },
      take: 6,
    });
    companionIds = grouped.map((g) => g.productId);
  }

  // Keep only buyable companions (active, approved store, in stock).
  let companions = companionIds.length
    ? await prisma.product.findMany({ where: { id: { in: companionIds }, active: true, stockQty: { gt: 0 }, store: { approved: true } }, select })
    : [];
  // Preserve the co-purchase ranking.
  companions.sort((a, b) => companionIds.indexOf(a.id) - companionIds.indexOf(b.id));

  // Fallback: popular items in the same category.
  if (companions.length < 2) {
    const have = new Set([productId, ...companions.map((c) => c.id)]);
    const more = await prisma.product.findMany({
      where: { category: product.category, active: true, stockQty: { gt: 0 }, store: { approved: true }, id: { notIn: [...have] } },
      orderBy: [{ likeCount: "desc" }, { reviewCount: "desc" }],
      take: 2,
      select,
    });
    companions = [...companions, ...more];
  }

  // Only non-sized items can be "added all" without picking a size.
  const buyable = companions.filter((c) => !(c.sizes && c.sizes.trim()));
  return NextResponse.json({
    products: buyable.slice(0, 2).map((c) => ({
      id: c.id, name: c.name, slug: c.slug, priceCents: c.priceCents, emoji: c.emoji, imageUrls: c.imageUrls,
      madeInState: c.madeInState, storeName: c.store.name, shipFromState: c.store.shipFromState || c.store.state || c.madeInState,
    })),
  });
}
