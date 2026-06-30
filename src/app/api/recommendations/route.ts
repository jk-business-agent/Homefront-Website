// GET /api/recommendations — "Recommended for you".
// Signed-in: ranks products in the categories the user has liked or viewed,
// excluding ones they've already liked. Guests: most-liked / popular.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TAKE = 4;

export async function GET() {
  const user = await getCurrentUser();

  // Guests (or no signal): popular picks.
  async function popular() {
    return prisma.product.findMany({
      where: { active: true, store: { approved: true } },
      orderBy: [{ likeCount: "desc" }, { reviewCount: "desc" }],
      take: TAKE,
      include: { store: { select: { name: true, state: true, shipFromState: true } } },
    });
  }

  if (!user) {
    return NextResponse.json({ products: await popular(), personalized: false });
  }

  // Gather signal: categories of liked + recently-viewed products.
  const [favs, views] = await Promise.all([
    prisma.favorite.findMany({ where: { userId: user.id }, include: { product: { select: { category: true } } } }),
    prisma.productView.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 40, include: { product: { select: { category: true } } } }),
  ]);

  const likedProductIds = new Set(favs.map((f) => f.productId));
  const catScore = new Map<string, number>();
  for (const f of favs) {
    const cat = f.product?.category;
    if (cat) catScore.set(cat, (catScore.get(cat) ?? 0) + 3); // likes weigh more
  }
  for (const v of views) {
    const cat = v.product?.category;
    if (cat) catScore.set(cat, (catScore.get(cat) ?? 0) + 1);
  }

  const topCats = [...catScore.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 3);
  if (topCats.length === 0) {
    return NextResponse.json({ products: await popular(), personalized: false });
  }

  // Best-rated products in those categories that the user hasn't liked yet.
  const candidates = await prisma.product.findMany({
    where: { active: true, store: { approved: true }, category: { in: topCats }, id: { notIn: [...likedProductIds] } },
    orderBy: [{ likeCount: "desc" }, { reviewCount: "desc" }],
    take: TAKE * 3,
    include: { store: { select: { name: true, state: true, shipFromState: true } } },
  });

  let products = candidates.slice(0, TAKE);
  if (products.length < TAKE) {
    // top up with popular picks
    const extra = (await popular()).filter((p) => !products.some((x) => x.id === p.id) && !likedProductIds.has(p.id));
    products = [...products, ...extra].slice(0, TAKE);
  }

  return NextResponse.json({ products, personalized: true, basedOn: topCats });
}
