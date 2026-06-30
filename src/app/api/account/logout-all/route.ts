// POST /api/account/logout-all — sign out of every device by bumping the user's
// token version (all existing session cookies become invalid).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, clearSession } from "@/lib/auth";
import { logSecurityEvent } from "@/lib/security-log";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let session;
  try { session = await requireUser(); } catch { return NextResponse.json({ error: "Please sign in" }, { status: 401 }); }
  await prisma.user.update({ where: { id: session.id }, data: { tokenVersion: { increment: 1 } } });
  await logSecurityEvent(session.id, "logout_all", req);
  await clearSession();
  return NextResponse.json({ ok: true });
}
