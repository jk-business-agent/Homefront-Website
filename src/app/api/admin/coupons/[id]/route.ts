// PATCH/DELETE /api/admin/coupons/[id] — toggle/edit or delete a coupon.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  active: z.boolean().optional(),
  value: z.number().int().positive().optional(),
  minSubtotalCents: z.number().int().nonnegative().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  const coupon = await prisma.coupon.update({ where: { id }, data: parsed.data }).catch(() => null);
  if (!coupon) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ coupon });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const { id } = await params;
  await prisma.coupon.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
