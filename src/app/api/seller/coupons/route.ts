// Seller-run coupons (scoped to the seller's own store).
//   GET  /api/seller/coupons — list this store's codes
//   POST /api/seller/coupons — create one
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSeller } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function myStore() {
  const user = await requireSeller();
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  return store;
}

export async function GET() {
  let store;
  try { store = await myStore(); } catch { return NextResponse.json({ error: "Seller access required" }, { status: 401 }); }
  if (!store) return NextResponse.json({ error: "No store found" }, { status: 404 });
  const coupons = await prisma.coupon.findMany({ where: { storeId: store.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ coupons });
}

const schema = z.object({
  code: z.string().min(2, "Code is required"),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().positive(), // percent (1-100) or dollar amount
  minSubtotalDollars: z.number().nonnegative().default(0),
  maxUses: z.number().int().positive().nullable().optional(),
});

export async function POST(req: NextRequest) {
  let store;
  try { store = await myStore(); } catch { return NextResponse.json({ error: "Seller access required" }, { status: 401 }); }
  if (!store) return NextResponse.json({ error: "No store found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  const d = parsed.data;
  const code = d.code.trim().toUpperCase();
  if (d.type === "PERCENT" && d.value > 100) return NextResponse.json({ error: "Percent must be 1–100" }, { status: 400 });
  // FIXED value comes in dollars from the UI → store as cents. PERCENT is a whole number.
  const value = d.type === "FIXED" ? Math.round(d.value * 100) : Math.round(d.value);
  if (await prisma.coupon.findUnique({ where: { code } })) return NextResponse.json({ error: "That code is already taken — try another." }, { status: 409 });

  const coupon = await prisma.coupon.create({
    data: {
      code, type: d.type, value,
      minSubtotalCents: Math.round((d.minSubtotalDollars || 0) * 100),
      maxUses: d.maxUses ?? null, active: true, storeId: store.id,
    },
  });
  return NextResponse.json({ coupon }, { status: 201 });
}
