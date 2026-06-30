// PATCH  /api/seller/coupons/[id] — toggle active (own store only)
// DELETE /api/seller/coupons/[id] — remove (own store only)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSeller } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function ownedCoupon(id: string) {
  const user = await requireSeller();
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return null;
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon || coupon.storeId !== store.id) return null;
  return coupon;
}

const schema = z.object({ active: z.boolean() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let coupon;
  try { coupon = await ownedCoupon((await params).id); } catch { return NextResponse.json({ error: "Seller access required" }, { status: 401 }); }
  if (!coupon) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  const updated = await prisma.coupon.update({ where: { id: coupon.id }, data: { active: parsed.data.active } });
  return NextResponse.json({ coupon: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let coupon;
  try { coupon = await ownedCoupon((await params).id); } catch { return NextResponse.json({ error: "Seller access required" }, { status: 401 }); }
  if (!coupon) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.coupon.delete({ where: { id: coupon.id } });
  return NextResponse.json({ ok: true });
}
