// GET /api/account/credit — the signed-in buyer's store-credit balance (cents).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ storeCreditCents: 0 });
  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { storeCreditCents: true } });
  return NextResponse.json({ storeCreditCents: u?.storeCreditCents ?? 0 });
}
