// GET /api/admin/reviews — all reviews for moderation (newest first).
// Optional ?filter=hidden|visible.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const filter = new URL(req.url).searchParams.get("filter");
  const where = filter === "hidden" ? { hidden: true } : filter === "visible" ? { hidden: false } : {};
  const reviews = await prisma.review.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { product: { select: { name: true, slug: true } } },
  });
  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id, rating: r.rating, title: r.title, body: r.body, authorName: r.authorName,
      hidden: r.hidden, createdAt: r.createdAt, productName: r.product.name, productSlug: r.product.slug,
    })),
  });
}
