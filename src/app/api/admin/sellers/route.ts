// GET /api/admin/sellers — every store, with status, for admin management.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const stores = await prisma.store.findMany({
    orderBy: { name: "asc" },
    include: { owner: { select: { email: true } }, _count: { select: { products: true } } },
  });
  return NextResponse.json({
    sellers: stores.map((s) => ({
      id: s.id, name: s.name, slug: s.slug, email: s.owner.email,
      city: s.city, state: s.state, products: s._count.products,
      approved: s.approved, featured: s.featured,
      onboardingComplete: s.onboardingComplete, w9OnFile: !!s.taxId,
    })),
  });
}
