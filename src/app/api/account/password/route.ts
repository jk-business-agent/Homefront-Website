// POST /api/account/password — change the signed-in user's password.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, verifyPassword, hashPassword } from "@/lib/auth";
import { checkPasswordStrength } from "@/lib/password";
import { logSecurityEvent } from "@/lib/security-log";

export const dynamic = "force-dynamic";

const schema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  let sessionUser;
  try { sessionUser = await requireUser(); } catch { return NextResponse.json({ error: "Please sign in" }, { status: 401 }); }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  const { currentPassword, newPassword } = parsed.data;

  const weak = checkPasswordStrength(newPassword);
  if (weak) return NextResponse.json({ error: weak }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Your current password is incorrect" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
  await logSecurityEvent(user.id, "password_change", req);
  return NextResponse.json({ ok: true });
}
