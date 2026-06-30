// GET /api/posts — list published newsletter stories (newest first).
// Optional: ?limit=3
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limit = Number(new URL(req.url).searchParams.get("limit")) || undefined;
  const posts = await prisma.post.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, title: true, slug: true, excerpt: true, coverEmoji: true, category: true, author: true, createdAt: true },
  });
  return NextResponse.json({ posts });
}
