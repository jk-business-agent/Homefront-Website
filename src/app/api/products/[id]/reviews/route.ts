// Reviews for a product.
//   GET  /api/products/[id]/reviews — list reviews
//   POST /api/products/[id]/reviews — leave a review (must be signed in)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = await params;
  const reviews = await prisma.review.findMany({
    where: { productId, hidden: false },
    orderBy: { createdAt: "desc" },
  });
  const parsed = reviews.map((r) => ({ ...r, media: r.media ? JSON.parse(r.media) as string[] : [] }));
  return NextResponse.json({ reviews: parsed });
}

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().min(1, "Please write a few words").max(5000, "Review is too long"),
  media: z.array(z.string()).max(10, "Too many attachments").optional(), // photo/video URLs
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Please sign in to leave a review" }, { status: 401 });
  }
  // Anti-spam: cap reviews per user per minute.
  if (!rateLimit("review", `${user.id}`, 10, 60 * 1000)) {
    return NextResponse.json({ error: "You're posting too fast. Please wait a moment." }, { status: 429 });
  }
  const { id: productId } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  const { rating, title, body, media } = parsed.data;

  // "Verified purchase" — true if this buyer has actually ordered this product.
  const purchased = await prisma.orderItem.count({ where: { productId, order: { buyerId: user.id } } });

  const review = await prisma.review.create({
    data: {
      rating, title, body,
      media: media && media.length ? JSON.stringify(media) : null,
      authorName: user.name,
      userId: user.id,
      productId,
      verified: purchased > 0,
    },
  });

  // Recompute the product's average rating + count from visible reviews.
  const agg = await prisma.review.aggregate({
    where: { productId, hidden: false },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.product.update({
    where: { id: productId },
    data: { rating: Math.round((agg._avg.rating ?? rating) * 10) / 10, reviewCount: agg._count },
  });

  return NextResponse.json({ review: { ...review, media: media ?? [] } }, { status: 201 });
}
