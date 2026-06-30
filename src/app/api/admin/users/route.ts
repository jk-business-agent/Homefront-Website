// GET /api/admin/users — list/search all accounts (admin).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const sp = new URL(req.url).searchParams;
  const search = sp.get("search")?.trim();
  const role = sp.get("role")?.trim();
  const where: any = {};
  if (role && role !== "ALL") where.role = role;
  if (search) where.OR = [{ name: { contains: search } }, { email: { contains: search } }];

  const users = await prisma.user.findMany({
    where, orderBy: { createdAt: "desc" }, take: 200,
    select: { id: true, name: true, email: true, role: true, suspended: true, createdAt: true, _count: { select: { orders: true } } },
  });
  return NextResponse.json({
    users: users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, suspended: u.suspended, createdAt: u.createdAt, orders: u._count.orders })),
  });
}
