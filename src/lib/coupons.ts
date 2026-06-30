// Coupon validation + discount math, shared by the validate API and order placement.
// Supports platform-wide coupons (admin, storeId=null) and seller coupons
// (storeId set) whose discount applies only to that store's items in the cart.
import { prisma } from "./prisma";

export type CouponResult =
  | { valid: true; code: string; discountCents: number; label: string }
  | { valid: false; error: string };

export type CartTotals = { subtotalCents: number; storeSubtotals: Record<string, number> };

// The promo code new newsletter subscribers receive. Admin manages the actual
// discount (%/active/expiry) under Admin → Coupons; this is just the code string.
export const WELCOME_CODE = "WELCOME10";

// Returns the welcome offer { code, label } if that coupon is currently usable, else null.
export async function getWelcomeOffer(): Promise<{ code: string; label: string } | null> {
  const c = await prisma.coupon.findUnique({ where: { code: WELCOME_CODE } });
  if (!c || !c.active) return null;
  if (c.expiresAt && c.expiresAt < new Date()) return null;
  const label = c.type === "PERCENT" ? `${c.value}% off your first order` : `${(c.value / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })} off your first order`;
  return { code: c.code, label };
}

// Given cart items, look up real prices and split the subtotal by store.
export async function cartTotalsFromItems(items: { productId: string; quantity: number }[]): Promise<CartTotals> {
  const ids = items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, priceCents: true, storeId: true } });
  const byId = new Map(products.map((p) => [p.id, p]));
  let subtotalCents = 0;
  const storeSubtotals: Record<string, number> = {};
  for (const i of items) {
    const p = byId.get(i.productId);
    if (!p) continue;
    const line = p.priceCents * i.quantity;
    subtotalCents += line;
    storeSubtotals[p.storeId] = (storeSubtotals[p.storeId] || 0) + line;
  }
  return { subtotalCents, storeSubtotals };
}

// Validate a code against cart totals and return the discount.
export async function evaluateCoupon(rawCode: string, totals: CartTotals): Promise<CouponResult> {
  const code = (rawCode || "").trim().toUpperCase();
  if (!code) return { valid: false, error: "Enter a code" };

  const c = await prisma.coupon.findUnique({ where: { code } });
  if (!c || !c.active) return { valid: false, error: "That code isn't valid" };
  if (c.expiresAt && c.expiresAt < new Date()) return { valid: false, error: "That code has expired" };
  if (c.maxUses != null && c.usedCount >= c.maxUses) return { valid: false, error: "That code has been fully redeemed" };

  // Seller coupons only discount that store's items; admin coupons use the whole subtotal.
  const applicable = c.storeId ? (totals.storeSubtotals[c.storeId] || 0) : totals.subtotalCents;
  if (c.storeId && applicable <= 0) {
    return { valid: false, error: "This code only applies to items from a specific maker — none are in your cart." };
  }
  if (applicable < c.minSubtotalCents) {
    return { valid: false, error: `Spend ${(c.minSubtotalCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })} ${c.storeId ? "with this maker " : ""}to use this code` };
  }

  const discountCents =
    c.type === "PERCENT"
      ? Math.round((applicable * Math.min(100, c.value)) / 100)
      : Math.min(c.value, applicable);

  const label = c.type === "PERCENT" ? `${c.value}% off` : `${(c.value / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })} off`;
  return { valid: true, code, discountCents, label };
}
