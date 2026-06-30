// Admin: edit or delete one newsletter post.
//   PATCH  /api/admin/posts/[id]
//   DELETE /api/admin/posts/[id]
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { bodyFromBlocks } from "@/lib/post-blocks";

export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().min(1).optional(),
  excerpt: z.string().min(1).optional(),
  body: z.string().optional(),
  blocks: z.string().optional(),
  coverEmoji: z.string().optional(),
  coverImage: z.string().nullable().optional(),
  author: z.string().optional(),
  category: z.string().optional(),
  published: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const exists = await prisma.post.findUnique({ where: { id } });
  if (!exists) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  // If blocks changed, refresh the plain-text body fallback from them.
  const data: any = { ...parsed.data };
  if (parsed.data.blocks !== undefined) {
    data.body = bodyFromBlocks(parsed.data.blocks, exists.body);
  }

  const post = await prisma.post.update({ where: { id }, data });
  return NextResponse.json({ post });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const { id } = await params;
  await prisma.post.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
