// POST /api/gift-cards/redeem — redeem a gift card code into store credit.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({ code: z.string().min(4) });

export async function POST(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Please sign in" }, { status: 401 }); }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a gift card code" }, { status: 400 });

  const code = parsed.data.code.trim().toUpperCase();
  const card = await prisma.giftCard.findUnique({ where: { code } });
  if (!card) return NextResponse.json({ error: "That code isn't valid." }, { status: 404 });
  if (card.redeemedById || card.balanceCents <= 0) return NextResponse.json({ error: "This gift card has already been redeemed." }, { status: 409 });

  const amount = card.balanceCents;
  const result = await prisma.$transaction(async (tx) => {
    await tx.giftCard.update({ where: { id: card.id }, data: { balanceCents: 0, redeemedById: user!.id } });
    return tx.user.update({ where: { id: user!.id }, data: { storeCreditCents: { increment: amount } }, select: { storeCreditCents: true } });
  });

  return NextResponse.json({ ok: true, creditedCents: amount, balanceCents: result.storeCreditCents });
}
