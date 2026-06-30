// GET /api/seller/reviews — all reviews left on this seller's products.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSeller } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  let user;
  try { user = await requireSeller(); } catch { return NextResponse.json({ error: "Seller access required" }, { status: 401 }); }
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return NextResponse.json({ error: "No store found" }, { status: 404 });

  const reviews = await prisma.review.findMany({
    where: { product: { storeId: store.id } },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { name: true, emoji: true, slug: true } } },
  });

  const avg = reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : 0;

  return NextResponse.json({
    averageRating: avg,
    count: reviews.length,
    reviews: reviews.map((r) => ({
      id: r.id, rating: r.rating, title: r.title, body: r.body,
      authorName: r.authorName, createdAt: r.createdAt,
      product: r.product, media: r.media ? JSON.parse(r.media) : [],
    })),
  });
}
