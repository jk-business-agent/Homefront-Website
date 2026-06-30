// Orders for the logged-in buyer.
//   POST /api/orders  — place an order from cart items
//   GET  /api/orders  — list this buyer's past orders
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { quoteShipping, findServiceLabel } from "@/lib/shipping";
import { evaluateCoupon } from "@/lib/coupons";
import { sendEmail, brandEmail } from "@/lib/email";

// Always read live, per-user data — never serve a cached response.
export const dynamic = "force-dynamic";

const schema = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive(), size: z.string().nullable().optional() })).min(1),
  shipping: z.object({
    fullName: z.string().min(1),
    line1: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zip: z.string().min(1),
  }),
  shippingService: z.string().optional(),
  couponCode: z.string().optional(),
  useCredit: z.boolean().optional(), // apply available store credit
});

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Please sign in to place an order" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order. Check your cart and shipping details." }, { status: 400 });
  }
  const { items, shipping, shippingService, couponCode, useCredit } = parsed.data;

  // Look up the real products so prices come from the database, not the client.
  const ids = items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: ids }, active: true } });
  const byId = new Map(products.map((p) => [p.id, p]));

  // Per-size stock (variants) for any sized products in the cart.
  const variants = await prisma.productVariant.findMany({ where: { productId: { in: ids } } });
  const variantBy = new Map(variants.map((v) => [`${v.productId}|${v.size}`, v]));
  const hasVariants = new Set(variants.map((v) => v.productId));

  for (const i of items) {
    const p = byId.get(i.productId);
    if (!p) return NextResponse.json({ error: "A product in your cart is no longer available" }, { status: 400 });
    if (hasVariants.has(i.productId)) {
      const v = i.size ? variantBy.get(`${i.productId}|${i.size}`) : undefined;
      if (!v) return NextResponse.json({ error: `Please choose a size for ${p.name}` }, { status: 400 });
      if (v.stockQty < i.quantity) return NextResponse.json({ error: `${p.name} — size ${i.size} only has ${v.stockQty} left` }, { status: 400 });
    } else if (p.stockQty < i.quantity) {
      return NextResponse.json({ error: `Not enough stock for ${p.name}` }, { status: 400 });
    }
  }

  const subtotalCents = items.reduce((sum, i) => sum + byId.get(i.productId)!.priceCents * i.quantity, 0);
  // Per-store subtotals so seller coupons only discount that store's items.
  const storeSubtotals: Record<string, number> = {};
  for (const i of items) {
    const p = byId.get(i.productId)!;
    storeSubtotals[p.storeId] = (storeSubtotals[p.storeId] || 0) + p.priceCents * i.quantity;
  }

  // Recompute shipping server-side from real product weights (don't trust the client).
  const totalOz = items.reduce((sum, i) => sum + (byId.get(i.productId)!.weightOz ?? 16) * i.quantity, 0);
  const options = quoteShipping(totalOz, shipping.zip);
  const chosen = options.find((o) => o.service === shippingService) ?? options[0];
  const shippingCents = chosen.priceCents;
  const taxCents = Math.round(subtotalCents * 0.07);

  // Re-validate the coupon server-side (don't trust the client's discount).
  let discountCents = 0;
  let appliedCode: string | null = null;
  if (couponCode) {
    const result = await evaluateCoupon(couponCode, { subtotalCents, storeSubtotals });
    if (result.valid) { discountCents = result.discountCents; appliedCode = result.code; }
  }

  const beforeCredit = Math.max(0, subtotalCents + shippingCents + taxCents - discountCents);

  // Apply store credit if the buyer opted in (capped at the order total and their balance).
  let creditCents = 0;
  if (useCredit) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { storeCreditCents: true } });
    creditCents = Math.min(dbUser?.storeCreditCents ?? 0, beforeCredit);
  }
  const totalCents = Math.max(0, beforeCredit - creditCents);

  // Create the order, its line items, decrement stock, count the coupon — all or nothing.
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        buyerId: user!.id,
        status: "PAID", // payments are simulated for now; Stripe comes in a later step
        totalCents,
        discountCents,
        creditCents,
        couponCode: appliedCode,
        shippingCents,
        shippingService: findServiceLabel(chosen.service),
        shippingName: shipping.fullName,
        shippingLine1: shipping.line1,
        shippingCity: shipping.city,
        shippingState: shipping.state,
        shippingZip: shipping.zip,
        items: {
          create: items.map((i) => {
            const p = byId.get(i.productId)!;
            return { productId: p.id, storeId: p.storeId, quantity: i.quantity, unitPriceCents: p.priceCents, size: i.size ?? null };
          }),
        },
      },
      include: { items: true },
    });
    for (const i of items) {
      // Decrement the product's total, and the specific size's stock if sized.
      await tx.product.update({ where: { id: i.productId }, data: { stockQty: { decrement: i.quantity } } });
      if (hasVariants.has(i.productId) && i.size) {
        await tx.productVariant.updateMany({ where: { productId: i.productId, size: i.size }, data: { stockQty: { decrement: i.quantity } } });
      }
    }
    if (appliedCode) {
      await tx.coupon.update({ where: { code: appliedCode }, data: { usedCount: { increment: 1 } } });
    }
    if (creditCents > 0) {
      await tx.user.update({ where: { id: user!.id }, data: { storeCreditCents: { decrement: creditCents } } });
    }
    return created;
  });

  // Order confirmation email (best-effort; simulated until Resend keys are set).
  sendEmail({
    to: user.email,
    subject: `Your Homefront Markets order #${order.id.slice(-6).toUpperCase()}`,
    html: brandEmail("Thank you for your order! 🇺🇸", `
      <p>Hi ${user.name.split(" ")[0]}, we've received your order <strong>#${order.id.slice(-6).toUpperCase()}</strong>.</p>
      <p>Total: <strong>${(order.totalCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}</strong>${creditCents > 0 ? ` (incl. ${(creditCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })} store credit)` : ""}</p>
      <p>We'll email you again when it ships. Thanks for keeping American makers working!</p>`,
      { label: "View your order", url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/account/orders/${order.id}` }),
  }).catch(() => {});

  return NextResponse.json({ order }, { status: 201 });
}

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  }
  const orders = await prisma.order.findMany({
    where: { buyerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: { select: { name: true, emoji: true } } } } },
  });
  return NextResponse.json({ orders });
}
