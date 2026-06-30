// Questions on a product.
//   GET  /api/products/[id]/questions — list (public)
//   POST /api/products/[id]/questions — ask a question (signed in)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = await params;
  const questions = await prisma.question.findMany({
    where: { productId },
    orderBy: [{ answeredAt: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ questions });
}

const schema = z.object({ body: z.string().min(3, "Type your question").max(1000, "Question is too long") });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Please sign in to ask a question" }, { status: 401 }); }
  if (!rateLimit("question", user.id, 8, 60 * 1000)) {
    return NextResponse.json({ error: "You're asking too fast — please wait a moment." }, { status: 429 });
  }
  const { id: productId } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const question = await prisma.question.create({
    data: { productId, body: parsed.data.body.trim(), authorName: user.name, userId: user.id },
  });
  return NextResponse.json({ question }, { status: 201 });
}
