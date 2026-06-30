// GET /api/products — list/search products.
// Optional query params: ?category=Kitchen  &search=skillet  &sort=price_asc|price_desc|rating
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search")?.trim();
  const sort = searchParams.get("sort");

  const where: any = { active: true, store: { approved: true } };
  if (category && category !== "All") where.category = category;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
      { madeInState: { contains: search } },
      { store: { is: { name: { contains: search } } } },
    ];
  }

  const orderBy =
    sort === "price_asc" ? { priceCents: "asc" as const } :
    sort === "price_desc" ? { priceCents: "desc" as const } :
    sort === "rating" ? { rating: "desc" as const } :
    { reviewCount: "desc" as const };

  const products = await prisma.product.findMany({
    where,
    orderBy,
    include: { store: { select: { name: true, slug: true, state: true } } },
  });

  return NextResponse.json({ products, count: products.length });
}
