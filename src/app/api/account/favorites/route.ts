// GET /api/account/favorites — the logged-in user's liked products.
// ?ids=1 returns just the productId list (used by the heart buttons).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ productIds: [], favorites: [] });

  const idsOnly = new URL(req.url).searchParams.get("ids") === "1";

  if (idsOnly) {
    const favs = await prisma.favorite.findMany({ where: { userId: user.id }, select: { productId: true } });
    return NextResponse.json({ productIds: favs.map((f) => f.productId) });
  }

  const favs = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { product: { include: { store: { select: { name: true, state: true, shipFromState: true } } } } },
  });
  // `favorites` keeps the legacy product-array shape; `saved` adds the note + favorite id.
  return NextResponse.json({
    favorites: favs.map((f) => f.product),
    saved: favs.map((f) => ({ id: f.id, note: f.note, product: f.product })),
  });
}

// PATCH /api/account/favorites — save a private note on a liked item.
const noteSchema = z.object({ productId: z.string(), note: z.string().max(500).nullable() });

export async function PATCH(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Please sign in" }, { status: 401 }); }
  const parsed = noteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  const note = parsed.data.note?.trim() || null;
  const res = await prisma.favorite.updateMany({ where: { userId: user.id, productId: parsed.data.productId }, data: { note } });
  if (res.count === 0) return NextResponse.json({ error: "Not in your saved items" }, { status: 404 });
  return NextResponse.json({ ok: true, note });
}
