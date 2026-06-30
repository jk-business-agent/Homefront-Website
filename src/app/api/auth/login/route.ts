// POST /api/auth/login — check email + password (+ 2FA code if enabled), start a session.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";
import { loginLockout, recordLoginFailure, clearLoginFailures } from "@/lib/rate-limit";
import { logSecurityEvent } from "@/lib/security-log";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  token: z.string().optional(), // 2FA code or backup code
});

// Check a backup code against the stored hashed list; consume it if it matches.
async function consumeBackupCode(userId: string, codesJson: string | null, token: string): Promise<boolean> {
  if (!codesJson) return false;
  let hashes: string[] = [];
  try { hashes = JSON.parse(codesJson); } catch { return false; }
  const candidate = token.trim().toUpperCase();
  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(candidate, hashes[i])) {
      hashes.splice(i, 1); // single-use
      await prisma.user.update({ where: { id: userId }, data: { totpBackupCodes: JSON.stringify(hashes) } });
      return true;
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  const { email, password, token } = parsed.data;

  // Brute-force protection: lock out after too many failed attempts.
  const wait = loginLockout(email, Date.now());
  if (wait) {
    return NextResponse.json({ error: `Too many failed attempts. Try again in ${wait} minute(s).` }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Same message whether email or password is wrong (don't leak which).
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    recordLoginFailure(email, Date.now());
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  if (user.suspended) {
    return NextResponse.json({ error: "This account has been suspended. Contact support." }, { status: 403 });
  }

  // Two-factor step (password was correct).
  if (user.totpEnabled) {
    if (!token) {
      return NextResponse.json({ twoFactorRequired: true }, { status: 200 });
    }
    const okTotp = user.totpSecret && verifyTotp(user.totpSecret, token, Date.now());
    const okBackup = !okTotp && (await consumeBackupCode(user.id, user.totpBackupCodes, token));
    if (!okTotp && !okBackup) {
      // Count failed 2FA attempts toward the same lockout so the second factor can't be brute-forced.
      recordLoginFailure(email, Date.now());
      return NextResponse.json({ error: "Invalid authentication code", twoFactorRequired: true }, { status: 401 });
    }
  }

  clearLoginFailures(email); // successful login resets the counter
  const sessionUser = { id: user.id, email: user.email, name: user.name, role: user.role };
  await createSession(sessionUser, user.tokenVersion);
  await logSecurityEvent(user.id, "login", req);
  return NextResponse.json({ user: sessionUser });
}
