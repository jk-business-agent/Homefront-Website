// POST /api/account/2fa/enable — confirm a code from the authenticator, turn 2FA on,
// and return one-time backup codes (shown once).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser, hashPassword } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";
import { logSecurityEvent } from "@/lib/security-log";

export const dynamic = "force-dynamic";

const schema = z.object({ token: z.string().min(6) });

function makeBackupCode(): string {
  const hex = crypto.randomBytes(4).toString("hex").toUpperCase(); // 8 chars
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
}

export async function POST(req: NextRequest) {
  let session;
  try { session = await requireUser(); } catch { return NextResponse.json({ error: "Please sign in" }, { status: 401 }); }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the 6-digit code" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { totpSecret: true, totpEnabled: true } });
  if (!user?.totpSecret) return NextResponse.json({ error: "Start setup first." }, { status: 400 });
  if (user.totpEnabled) return NextResponse.json({ error: "Already enabled." }, { status: 409 });
  if (!verifyTotp(user.totpSecret, parsed.data.token, Date.now())) {
    return NextResponse.json({ error: "That code didn't match. Check your authenticator and try again." }, { status: 400 });
  }

  // Generate + store hashed backup codes; return the plaintext once.
  const plain = Array.from({ length: 10 }, makeBackupCode);
  const hashed = await Promise.all(plain.map((c) => hashPassword(c)));
  await prisma.user.update({ where: { id: session.id }, data: { totpEnabled: true, totpBackupCodes: JSON.stringify(hashed) } });
  await logSecurityEvent(session.id, "2fa_enabled", req);

  return NextResponse.json({ enabled: true, backupCodes: plain });
}
