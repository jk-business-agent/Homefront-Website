// Conversations list + starting a new one.
//   GET  /api/messages?as=buyer|seller|admin — list conversations for the current user
//   POST /api/messages — start (or continue) a conversation with a store
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Shape each conversation for the inbox list.
function summarize(c: any) {
  const last = c.messages?.[0];
  return {
    id: c.id,
    subject: c.subject,
    storeName: c.store?.name,
    buyerName: c.buyer?.name,
    lastMessageAt: c.lastMessageAt,
    lastSnippet: last ? `${last.senderName}: ${last.body}` : "",
  };
}

export async function GET(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Please sign in" }, { status: 401 }); }
  const as = new URL(req.url).searchParams.get("as") || "buyer";

  let where: any;
  if (as === "admin") {
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
    where = {};
  } else if (as === "seller") {
    where = { store: { ownerId: user.id } };
  } else {
    where = { buyerId: user.id };
  }

  const convos = await prisma.conversation.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    include: {
      store: { select: { name: true } },
      buyer: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  return NextResponse.json({ conversations: convos.map(summarize) });
}

const startSchema = z.object({
  storeId: z.string(),
  orderId: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().min(1, "Write a message"),
});

export async function POST(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Please sign in to message a maker" }, { status: 401 }); }

  const parsed = startSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  const { storeId, orderId, subject, body } = parsed.data;

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });
  if (store.ownerId === user.id) return NextResponse.json({ error: "You can't message your own store" }, { status: 400 });

  // One thread per buyer + store (reuse if it exists).
  let convo = await prisma.conversation.findFirst({ where: { buyerId: user.id, storeId } });
  if (!convo) {
    convo = await prisma.conversation.create({
      data: { buyerId: user.id, storeId, orderId: orderId ?? null, subject: subject ?? "New conversation" },
    });
  }

  await prisma.message.create({
    data: { conversationId: convo.id, senderId: user.id, senderRole: "BUYER", senderName: user.name, body },
  });
  await prisma.conversation.update({ where: { id: convo.id }, data: { lastMessageAt: new Date() } });

  return NextResponse.json({ conversationId: convo.id }, { status: 201 });
}
