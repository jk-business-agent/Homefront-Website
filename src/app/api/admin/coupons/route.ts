// Admin coupon management.
//   GET  /api/admin/coupons — list
//   POST /api/admin/coupons — create
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  // Platform-wide coupons only; seller coupons are managed by their sellers.
  const coupons = await prisma.coupon.findMany({ where: { storeId: null }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ coupons });
}

const schema = z.object({
  code: z.string().min(2, "Code is required"),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().int().positive(),
  minSubtotalCents: z.number().int().nonnegative().default(0),
  maxUses: z.number().int().positive().nullable().optional(),
  active: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  const d = parsed.data;
  const code = d.code.trim().toUpperCase();
  if (d.type === "PERCENT" && d.value > 100) return NextResponse.json({ error: "Percent must be 1–100" }, { status: 400 });
  if (await prisma.coupon.findUnique({ where: { code } })) return NextResponse.json({ error: "That code already exists" }, { status: 409 });

  const coupon = await prisma.coupon.create({
    data: { code, type: d.type, value: d.value, minSubtotalCents: d.minSubtotalCents, maxUses: d.maxUses ?? null, active: d.active },
  });
  await logAudit(admin, "coupon.create", code);
  return NextResponse.json({ coupon }, { status: 201 });
}
