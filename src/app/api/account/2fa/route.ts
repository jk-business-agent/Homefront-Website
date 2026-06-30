// GET /api/account/2fa — whether 2FA is enabled (and how many backup codes remain).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  let session;
  try { session = await requireUser(); } catch { return NextResponse.json({ error: "Please sign in" }, { status: 401 }); }
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { totpEnabled: true, totpBackupCodes: true } });
  let backupRemaining = 0;
  try { backupRemaining = user?.totpBackupCodes ? JSON.parse(user.totpBackupCodes).length : 0; } catch {}
  return NextResponse.json({ enabled: !!user?.totpEnabled, backupRemaining });
}
