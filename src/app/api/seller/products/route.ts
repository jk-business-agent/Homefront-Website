// The logged-in seller's own products.
//   GET  /api/seller/products — list my products
//   POST /api/seller/products — add a new American-made product
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSeller } from "@/lib/auth";

// Always read live, per-seller data — never serve a cached response.
export const dynamic = "force-dynamic";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function getStore(userId: string) {
  return prisma.store.findUnique({ where: { ownerId: userId } });
}

export async function GET() {
  let user;
  try {
    user = await requireSeller();
  } catch {
    return NextResponse.json({ error: "Seller access required" }, { status: 401 });
  }
  const store = await getStore(user.id);
  if (!store) return NextResponse.json({ error: "No store found" }, { status: 404 });
  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    include: { variants: { orderBy: { id: "asc" } } },
  });
  return NextResponse.json({ store: { name: store.name }, products });
}

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  priceCents: z.number().int().positive(),
  category: z.string().min(1),
  emoji: z.string().optional(),
  madeInCity: z.string().optional(),
  madeInState: z.string().min(1, "American-made products must list the U.S. state of origin"),
  stockQty: z.number().int().nonnegative().default(100),
  weightOz: z.number().int().nonnegative().nullable().optional(),
  shippingPriceCents: z.number().int().nonnegative().default(0),
  dimensions: z.string().optional(),
  sizes: z.string().optional(), // comma-separated, e.g. "S,M,L,XL"
  safetyInfo: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  variants: z.array(z.object({ size: z.string().min(1), stockQty: z.number().int().nonnegative() })).optional(), // per-size stock
});

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireSeller();
  } catch {
    return NextResponse.json({ error: "Seller access required" }, { status: 401 });
  }
  const store = await getStore(user.id);
  if (!store) return NextResponse.json({ error: "No store found" }, { status: 404 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  const d = parsed.data;

  let slug = slugify(d.name);
  if (await prisma.product.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;

  // If per-size variants are given, they drive the sizes list + total stock.
  const usesVariants = d.variants && d.variants.length > 0;
  const sizes = usesVariants ? d.variants!.map((v) => v.size).join(",") : (d.sizes || null);
  const stockQty = usesVariants ? d.variants!.reduce((n, v) => n + v.stockQty, 0) : d.stockQty;

  const product = await prisma.product.create({
    data: {
      name: d.name,
      slug,
      description: d.description,
      priceCents: d.priceCents,
      category: d.category,
      emoji: d.emoji || "📦",
      madeInCity: d.madeInCity,
      madeInState: d.madeInState,
      stockQty,
      weightOz: d.weightOz ?? null,
      shippingPriceCents: d.shippingPriceCents,
      dimensions: d.dimensions || null,
      sizes,
      safetyInfo: d.safetyInfo || null,
      imageUrls: d.imageUrls && d.imageUrls.length ? JSON.stringify(d.imageUrls) : null,
      storeId: store.id,
      ...(usesVariants ? { variants: { create: d.variants!.map((v) => ({ size: v.size, stockQty: v.stockQty })) } } : {}),
    },
  });
  return NextResponse.json({ product }, { status: 201 });
}
