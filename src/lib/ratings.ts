// Recompute a product's average rating + review count from its VISIBLE reviews.
import { prisma } from "./prisma";

export async function recomputeProductRating(productId: string) {
  const agg = await prisma.review.aggregate({
    where: { productId, hidden: false },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.product.update({
    where: { id: productId },
    data: {
      rating: agg._count ? Math.round((agg._avg.rating ?? 0) * 10) / 10 : 0,
      reviewCount: agg._count,
    },
  });
}
