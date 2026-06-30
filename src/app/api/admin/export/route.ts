// GET /api/admin/export?type=orders|sellers|subscribers|sms|products — platform CSV exports.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function cell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(cell).join(",")).join("\n");
}

export async function GET(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const type = new URL(req.url).searchParams.get("type") || "orders";

  let headers: string[] = [], rows: unknown[][] = [], name = type;

  if (type === "orders") {
    const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" }, include: { buyer: { select: { email: true } } } });
    headers = ["Order", "Date", "Buyer", "Status", "Subtotal+ship+tax", "Discount", "Coupon", "City", "State"];
    rows = orders.map((o) => [`#${o.id.slice(-6).toUpperCase()}`, new Date(o.createdAt).toLocaleString(), o.buyer.email, o.status, (o.totalCents / 100).toFixed(2), (o.discountCents / 100).toFixed(2), o.couponCode || "", o.shippingCity, o.shippingState]);
  } else if (type === "sellers") {
    const stores = await prisma.store.findMany({ orderBy: { name: "asc" }, include: { owner: { select: { email: true } }, _count: { select: { products: true } } } });
    headers = ["Store", "Email", "City", "State", "Products", "Approved", "W-9 on file", "Legal name", "Business type"];
    rows = stores.map((s) => [s.name, s.owner.email, s.city || "", s.state || "", s._count.products, s.approved ? "yes" : "no", s.taxId ? "yes" : "no", s.legalName || "", s.businessType || ""]);
  } else if (type === "subscribers") {
    const subs = await prisma.subscriber.findMany({ orderBy: { createdAt: "desc" } });
    headers = ["Email", "Source", "Joined"];
    rows = subs.map((s) => [s.email, s.source, new Date(s.createdAt).toLocaleDateString()]);
  } else if (type === "sms") {
    const subs = await prisma.smsSubscriber.findMany({ orderBy: { createdAt: "desc" } });
    headers = ["Phone", "Consent", "Source", "Joined", "Consent text"];
    rows = subs.map((s) => [s.phone, s.consent ? "yes" : "no", s.source, new Date(s.createdAt).toLocaleString(), s.consentText || ""]);
  } else if (type === "products") {
    const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" }, include: { store: { select: { name: true } } } });
    headers = ["Name", "Store", "Category", "Price", "Stock", "Active", "Made in"];
    rows = products.map((p) => [p.name, p.store.name, p.category, (p.priceCents / 100).toFixed(2), p.stockQty, p.active ? "yes" : "no", [p.madeInCity, p.madeInState].filter(Boolean).join(", ")]);
  } else {
    return NextResponse.json({ error: "Unknown export type" }, { status: 400 });
  }

  return new NextResponse(toCsv(headers, rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="homefront-${name}.csv"` },
  });
}
