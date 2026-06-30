// Saved shipping addresses for the signed-in user.
//   GET    /api/account/addresses        — list
//   POST   /api/account/addresses        — add
//   DELETE /api/account/addresses?id=... — remove
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function user(): Promise<{ id: string } | null> {
  try { return await requireUser(); } catch { return null; }
}

export async function GET() {
  const u = await user();
  if (!u) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const addresses = await prisma.address.findMany({ where: { userId: u.id }, orderBy: { isDefault: "desc" } });
  return NextResponse.json({ addresses });
}

const schema = z.object({
  fullName: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  isDefault: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const u = await user();
  if (!u) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const isFirst = (await prisma.address.count({ where: { userId: u.id } })) === 0;
  const makeDefault = parsed.data.isDefault || isFirst;
  if (makeDefault) {
    await prisma.address.updateMany({ where: { userId: u.id }, data: { isDefault: false } });
  }
  const address = await prisma.address.create({
    data: { ...parsed.data, isDefault: makeDefault, userId: u.id },
  });
  return NextResponse.json({ address }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const u = await user();
  if (!u) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing address id" }, { status: 400 });
  const addr = await prisma.address.findUnique({ where: { id } });
  if (!addr || addr.userId !== u.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.address.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
