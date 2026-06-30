// Visitor → platform support chat ("Chat with us").
//   POST /api/support           — start a thread or send a message
//   GET  /api/support?threadId= — fetch a thread's messages (threadId acts as the key)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, clientIp, isBot } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const threadId = new URL(req.url).searchParams.get("threadId");
  if (!threadId) return NextResponse.json({ error: "Missing threadId" }, { status: 400 });
  const thread = await prisma.supportThread.findUnique({
    where: { id: threadId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ threadId: thread.id, messages: thread.messages });
}

const schema = z.object({
  threadId: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  body: z.string().min(1, "Type a message").max(5000, "Message is too long"),
  website: z.string().optional(), // honeypot
});

export async function POST(req: NextRequest) {
  if (!rateLimit("support", clientIp(req), 30, 60 * 1000)) {
    return NextResponse.json({ error: "Too many messages. Please slow down." }, { status: 429 });
  }
  const raw = await req.json().catch(() => null);
  if (isBot(raw)) return NextResponse.json({ ok: true }); // swallow bots quietly
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  const { threadId, body } = parsed.data;
  const user = await getCurrentUser();

  let thread = threadId ? await prisma.supportThread.findUnique({ where: { id: threadId } }) : null;

  if (!thread) {
    const name = parsed.data.name || user?.name;
    const email = parsed.data.email || user?.email;
    if (!name || !email) return NextResponse.json({ error: "Please add your name and email" }, { status: 400 });
    thread = await prisma.supportThread.create({ data: { name, email, userId: user?.id ?? null } });
  }

  await prisma.supportMessage.create({
    data: { threadId: thread.id, body, fromRole: "USER", senderName: thread.name },
  });
  await prisma.supportThread.update({ where: { id: thread.id }, data: { lastMessageAt: new Date(), status: "OPEN" } });

  const messages = await prisma.supportMessage.findMany({ where: { threadId: thread.id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ threadId: thread.id, messages }, { status: 201 });
}
