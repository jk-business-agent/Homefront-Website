// GET /api/admin/support — list all support threads (admin help desk).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const threads = await prisma.supportThread.findMany({
    orderBy: { lastMessageAt: "desc" },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return NextResponse.json({
    threads: threads.map((t) => ({
      id: t.id, name: t.name, email: t.email, status: t.status, lastMessageAt: t.lastMessageAt,
      lastSnippet: t.messages[0] ? `${t.messages[0].senderName}: ${t.messages[0].body}` : "",
    })),
  });
}
