// Admin help-desk thread.
//   GET  /api/admin/support/[id] — full thread
//   POST /api/admin/support/[id] — admin reply (also supports { status })
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const { id } = await params;
  const thread = await prisma.supportThread.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ thread: { id: thread.id, name: thread.name, email: thread.email, status: thread.status }, messages: thread.messages });
}

const schema = z.object({ body: z.string().min(1).optional(), status: z.enum(["OPEN", "CLOSED"]).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (parsed.data.status) {
    await prisma.supportThread.update({ where: { id }, data: { status: parsed.data.status } });
  }
  if (parsed.data.body) {
    await prisma.supportMessage.create({ data: { threadId: id, body: parsed.data.body, fromRole: "ADMIN", senderName: "Homefront Support" } });
    await prisma.supportThread.update({ where: { id }, data: { lastMessageAt: new Date() } });
  }
  const messages = await prisma.supportMessage.findMany({ where: { threadId: id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ ok: true, messages });
}
