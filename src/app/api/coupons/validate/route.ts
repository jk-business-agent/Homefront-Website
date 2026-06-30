// POST /api/coupons/validate — check a promo code against a cart subtotal (used at checkout).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { evaluateCoupon, cartTotalsFromItems } from "@/lib/coupons";

export const dynamic = "force-dynamic";

const schema = z.object({
  code: z.string(),
  subtotalCents: z.number().int().nonnegative().optional(),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ valid: false, error: "Invalid request" }, { status: 400 });

  // Prefer real cart items (trustworthy, store-aware); fall back to a bare subtotal.
  const totals = parsed.data.items
    ? await cartTotalsFromItems(parsed.data.items)
    : { subtotalCents: parsed.data.subtotalCents ?? 0, storeSubtotals: {} };

  const result = await evaluateCoupon(parsed.data.code, totals);
  return NextResponse.json(result);
}
