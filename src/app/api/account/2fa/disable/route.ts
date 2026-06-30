// POST /api/account/2fa/disable — turn off 2FA. Requires a valid current code OR
// the account password, so a hijacked open session can't silently disable it.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, verifyPassword } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";
import { logSecurityEvent } from "@/lib/security-log";

export const dynamic = "force-dynamic";

const schema = z.object({ token: z.string().optional(), password: z.string().optional() });

export async function POST(req: NextRequest) {
  let session;
  try { session = await requireUser(); } catch { return NextResponse.json({ error: "Please sign in" }, { status: 401 }); }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || !user.totpEnabled) return NextResponse.json({ error: "Two-factor isn't on." }, { status: 400 });

  const okByToken = parsed.data.token && user.totpSecret && verifyTotp(user.totpSecret, parsed.data.token, Date.now());
  const okByPassword = parsed.data.password && (await verifyPassword(parsed.data.password, user.passwordHash));
  if (!okByToken && !okByPassword) {
    return NextResponse.json({ error: "Enter a current 6-digit code or your password to turn off 2FA." }, { status: 400 });
  }

  await prisma.user.update({ where: { id: session.id }, data: { totpEnabled: false, totpSecret: null, totpBackupCodes: null } });
  await logSecurityEvent(session.id, "2fa_disabled", req);
  return NextResponse.json({ disabled: true });
}
