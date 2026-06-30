// GET /api/account/recently-viewed — the signed-in shopper's most recently viewed
// products (de-duplicated, newest first). Empty for signed-out visitors.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ products: [] });

  // Pull recent views, keep the first (newest) occurrence of each product.
  const views = await prisma.productView.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { productId: true },
  });
  const order: string[] = [];
  const seen = new Set<string>();
  for (const v of views) { if (!seen.has(v.productId)) { seen.add(v.productId); order.push(v.productId); } if (order.length >= 8) break; }
  if (order.length === 0) return NextResponse.json({ products: [] });

  const products = await prisma.product.findMany({
    where: { id: { in: order }, active: true, store: { approved: true } },
    include: { store: { select: { name: true, state: true, shipFromState: true } } },
  });
  // Preserve recency order.
  const byId = new Map(products.map((p) => [p.id, p]));
  const ordered = order.map((id) => byId.get(id)).filter(Boolean);
  return NextResponse.json({ products: ordered });
}
