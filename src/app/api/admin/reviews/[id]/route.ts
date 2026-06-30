// PATCH  /api/admin/reviews/[id] — hide/unhide a review
// DELETE /api/admin/reviews/[id] — remove a review
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { recomputeProductRating } from "@/lib/ratings";

export const dynamic = "force-dynamic";

const schema = z.object({ hidden: z.boolean() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const review = await prisma.review.update({ where: { id }, data: { hidden: parsed.data.hidden } });
  await recomputeProductRating(review.productId);
  await logAudit(admin, parsed.data.hidden ? "review.hide" : "review.unhide", `${review.authorName}: "${(review.title || review.body).slice(0, 40)}"`);
  return NextResponse.json({ review });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const { id } = await params;
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.review.delete({ where: { id } });
  await recomputeProductRating(review.productId);
  await logAudit(admin, "review.delete", `${review.authorName}: "${(review.title || review.body).slice(0, 40)}"`);
  return NextResponse.json({ ok: true });
}
