// POST /api/products/[id]/view — record a product page view (seller analytics + recommendations).
// Fire-and-forget from the product page. Best-effort; never blocks the user.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [product, user] = await Promise.all([
      prisma.product.findUnique({ where: { id }, select: { id: true, storeId: true } }),
      getCurrentUser(),
    ]);
    if (product) {
      await prisma.productView.create({
        data: { productId: product.id, storeId: product.storeId, userId: user?.id ?? null },
      });
    }
  } catch {
    // ignore — analytics should never break the page
  }
  return NextResponse.json({ ok: true });
}
