// A single conversation thread.
//   GET  /api/messages/[id] — full thread (participants + admin only)
//   POST /api/messages/[id] — reply
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, SessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Work out the current user's role within this conversation, or null if no access.
async function roleInConversation(conversationId: string, user: SessionUser) {
  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { store: { select: { ownerId: true, name: true } }, buyer: { select: { name: true } } },
  });
  if (!convo) return { convo: null, role: null as string | null };
  let role: string | null = null;
  if (convo.buyerId === user.id) role = "BUYER";
  else if (convo.store.ownerId === user.id) role = "SELLER";
  else if (user.role === "ADMIN") role = "ADMIN";
  return { convo, role };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Please sign in" }, { status: 401 }); }
  const { id } = await params;
  const { convo, role } = await roleInConversation(id, user);
  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!role) return NextResponse.json({ error: "No access to this conversation" }, { status: 403 });

  const messages = await prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({
    conversation: { id: convo.id, subject: convo.subject, storeName: convo.store.name, buyerName: convo.buyer.name },
    myRole: role,
    messages,
  });
}

const replySchema = z.object({ body: z.string().min(1, "Write a message") });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Please sign in" }, { status: 401 }); }
  const { id } = await params;
  const { convo, role } = await roleInConversation(id, user);
  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!role) return NextResponse.json({ error: "No access" }, { status: 403 });

  const parsed = replySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const senderName = role === "SELLER" ? convo.store.name : role === "ADMIN" ? "Homefront Support" : user.name;
  const message = await prisma.message.create({
    data: { conversationId: id, senderId: user.id, senderRole: role, senderName, body: parsed.data.body },
  });
  await prisma.conversation.update({ where: { id }, data: { lastMessageAt: new Date() } });
  return NextResponse.json({ message }, { status: 201 });
}
