// Account profile.
//   GET   /api/account/profile — current name/email
//   PATCH /api/account/profile — update name
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Please sign in" }, { status: 401 }); }
  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true, role: true, createdAt: true } });
  return NextResponse.json({ profile: u });
}

const schema = z.object({ name: z.string().min(1, "Name can't be empty") });

export async function PATCH(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Please sign in" }, { status: 401 }); }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  await prisma.user.update({ where: { id: user.id }, data: { name: parsed.data.name } });
  return NextResponse.json({ ok: true, name: parsed.data.name });
}
