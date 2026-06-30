// GET /api/admin/returns?status= — list return/refund requests for review.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const status = new URL(req.url).searchParams.get("status");
  const where = status && status !== "all" ? { status } : {};
  const returns = await prisma.returnRequest.findMany({ where, orderBy: { createdAt: "desc" }, take: 300 });

  // Attach the buyer's email + store name for context.
  const userIds = [...new Set(returns.map((r) => r.userId))];
  const storeIds = [...new Set(returns.map((r) => r.storeId))];
  const [users, stores] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } }),
    prisma.store.findMany({ where: { id: { in: storeIds } }, select: { id: true, name: true } }),
  ]);
  const ue = new Map(users.map((u) => [u.id, u.email]));
  const sn = new Map(stores.map((s) => [s.id, s.name]));

  return NextResponse.json({
    returns: returns.map((r) => ({ ...r, buyerEmail: ue.get(r.userId) || "", storeName: sn.get(r.storeId) || "" })),
  });
}
