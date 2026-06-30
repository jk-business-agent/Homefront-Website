// PATCH /api/admin/users/[id] — suspend/unsuspend or change a user's role.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  suspended: z.boolean().optional(),
  role: z.enum(["BUYER", "SELLER", "ADMIN"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const { id } = await params;
  if (id === admin.id) return NextResponse.json({ error: "You can't change your own account here" }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const user = await prisma.user.update({ where: { id }, data: parsed.data });

  if (parsed.data.suspended !== undefined) await logAudit(admin, parsed.data.suspended ? "user.suspend" : "user.unsuspend", `${target.email}`);
  if (parsed.data.role) await logAudit(admin, "user.role", `${target.email} → ${parsed.data.role}`);

  return NextResponse.json({ user: { id: user.id, role: user.role, suspended: user.suspended } });
}
