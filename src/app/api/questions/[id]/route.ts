// PATCH /api/questions/[id] — answer a question. Allowed for the product's seller
// (store owner) or an admin.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({ answer: z.string().min(1, "Type an answer").max(2000) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Please sign in" }, { status: 401 }); }
  const { id } = await params;

  const question = await prisma.question.findUnique({
    where: { id },
    include: { product: { select: { store: { select: { ownerId: true, name: true } } } } },
  });
  if (!question) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = question.product.store.ownerId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Only the seller or an admin can answer." }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const updated = await prisma.question.update({
    where: { id },
    data: { answer: parsed.data.answer.trim(), answeredBy: isOwner ? question.product.store.name : "Homefront Markets", answeredAt: new Date() },
  });
  return NextResponse.json({ question: updated });
}
