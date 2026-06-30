// GET /api/account/security-events — recent security activity for the signed-in user.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  let session;
  try { session = await requireUser(); } catch { return NextResponse.json({ error: "Please sign in" }, { status: 401 }); }
  const events = await prisma.securityEvent.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, type: true, ip: true, userAgent: true, createdAt: true },
  });
  return NextResponse.json({ events });
}
