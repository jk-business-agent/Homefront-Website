// POST /api/products/[id]/like — toggle a like/favorite for the logged-in user.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Please sign in to like items" }, { status: 401 });
  }
  const { id: productId } = await params;

  // Confirm the product exists before writing a favorite/like.
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const existing = await prisma.favorite.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.favorite.delete({ where: { id: existing.id } }),
      prisma.product.update({ where: { id: productId }, data: { likeCount: { decrement: 1 } } }),
    ]);
    const p = await prisma.product.findUnique({ where: { id: productId }, select: { likeCount: true } });
    return NextResponse.json({ liked: false, likeCount: p?.likeCount ?? 0 });
  }

  await prisma.$transaction([
    prisma.favorite.create({ data: { userId: user.id, productId } }),
    prisma.product.update({ where: { id: productId }, data: { likeCount: { increment: 1 } } }),
  ]);
  const p = await prisma.product.findUnique({ where: { id: productId }, select: { likeCount: true } });
  return NextResponse.json({ liked: true, likeCount: p?.likeCount ?? 0 });
}
