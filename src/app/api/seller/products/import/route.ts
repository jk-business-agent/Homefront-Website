// POST /api/seller/products/import — bulk-create products from parsed CSV rows.
// Body: { rows: [{ name, description, price, category, ... }] }  (string values OK)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSeller } from "@/lib/auth";

export const dynamic = "force-dynamic";

function slugify(s: string) {
  return s.toLowerCase().replace(/["'’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function num(v: any): number { const n = parseFloat(String(v ?? "").replace(/[$,]/g, "")); return Number.isNaN(n) ? 0 : n; }
function intOrNull(v: any): number | null { const s = String(v ?? "").trim(); if (!s) return null; const n = parseInt(s, 10); return Number.isNaN(n) ? null : n; }

// Parse "S:8;M:20;L:18" (or commas) into variants.
function parseSizeStock(raw: string): { size: string; stockQty: number }[] {
  if (!raw) return [];
  return raw.split(/[;,]/).map((p) => p.trim()).filter(Boolean).map((p) => {
    const [size, qty] = p.split(":").map((x) => x.trim());
    return { size, stockQty: parseInt(qty || "0", 10) || 0 };
  }).filter((v) => v.size);
}

export async function POST(req: NextRequest) {
  let user;
  try { user = await requireSeller(); } catch { return NextResponse.json({ error: "Seller access required" }, { status: 401 }); }
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return NextResponse.json({ error: "No store found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const rows: any[] = Array.isArray(body?.rows) ? body.rows : [];
  if (!rows.length) return NextResponse.json({ error: "No rows to import" }, { status: 400 });

  const errors: { row: number; error: string }[] = [];
  let created = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = String(r.name ?? "").trim();
    const description = String(r.description ?? "").trim();
    const madeInState = String(r.madeInState ?? r.madeinstate ?? "").trim();
    const priceCents = Math.round(num(r.price) * 100);

    if (!name) { errors.push({ row: i + 2, error: "Missing name" }); continue; }
    if (!description) { errors.push({ row: i + 2, error: "Missing description" }); continue; }
    if (priceCents <= 0) { errors.push({ row: i + 2, error: "Missing/invalid price" }); continue; }
    if (!madeInState) { errors.push({ row: i + 2, error: "Missing made-in state" }); continue; }

    const variants = parseSizeStock(String(r.sizeStock ?? r.sizestock ?? ""));
    const sizesCol = String(r.sizes ?? "").trim();
    const sizes = variants.length ? variants.map((v) => v.size).join(",") : (sizesCol || null);
    const stockQty = variants.length ? variants.reduce((n, v) => n + v.stockQty, 0) : (intOrNull(r.stockQty ?? r.stock) ?? 100);

    let slug = slugify(name);
    if (await prisma.product.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}-${i}`;

    try {
      await prisma.product.create({
        data: {
          name, slug, description, priceCents,
          category: String(r.category ?? "Home").trim() || "Home",
          emoji: String(r.emoji ?? "📦").trim() || "📦",
          madeInCity: String(r.madeInCity ?? r.madeincity ?? "").trim() || null,
          madeInState,
          stockQty,
          weightOz: intOrNull(r.weightOz ?? r.weightoz),
          shippingPriceCents: Math.round(num(r.shippingPrice ?? r.shippingprice) * 100),
          dimensions: String(r.dimensions ?? "").trim() || null,
          sizes,
          safetyInfo: String(r.safetyInfo ?? r.safetyinfo ?? "").trim() || null,
          storeId: store.id,
          ...(variants.length ? { variants: { create: variants } } : {}),
        },
      });
      created++;
    } catch (e: any) {
      errors.push({ row: i + 2, error: e?.message?.slice(0, 120) || "Could not create" });
    }
  }

  return NextResponse.json({ created, failed: errors.length, errors });
}
