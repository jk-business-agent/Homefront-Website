// POST /api/account/2fa/setup — begin enabling 2FA: generate a secret and return it
// plus the otpauth URI for the authenticator app. Not active until /enable confirms a code.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { generateTotpSecret, totpUri } from "@/lib/totp";

export const dynamic = "force-dynamic";

export async function POST() {
  let session;
  try { session = await requireUser(); } catch { return NextResponse.json({ error: "Please sign in" }, { status: 401 }); }

  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { totpEnabled: true, email: true } });
  if (user?.totpEnabled) return NextResponse.json({ error: "Two-factor is already on. Turn it off first to re-set it up." }, { status: 409 });

  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: session.id }, data: { totpSecret: secret } });
  return NextResponse.json({ secret, otpauthUri: totpUri(secret, user!.email) });
}
