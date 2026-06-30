// Admin newsletter management.
//   GET  /api/admin/posts — list ALL posts (incl. drafts)
//   POST /api/admin/posts — create a post
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { bodyFromBlocks } from "@/lib/post-blocks";

export const dynamic = "force-dynamic";

function slugify(s: string) {
  return s.toLowerCase().replace(/["'’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const posts = await prisma.post.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ posts });
}

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  excerpt: z.string().min(1, "Add a short teaser"),
  body: z.string().optional(),
  blocks: z.string().optional(), // JSON array of content blocks
  coverEmoji: z.string().optional(),
  coverImage: z.string().optional(),
  author: z.string().optional(),
  category: z.string().optional(),
  published: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  const d = parsed.data;

  let slug = slugify(d.title);
  if (await prisma.post.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;

  const derivedBody = bodyFromBlocks(d.blocks, d.body || "");
  const post = await prisma.post.create({
    data: {
      title: d.title, slug, excerpt: d.excerpt, body: derivedBody || d.body || "",
      blocks: d.blocks || null,
      coverEmoji: d.coverEmoji || "📰", coverImage: d.coverImage || null,
      author: d.author || "Homefront Markets", category: d.category || "Maker Stories",
      published: d.published ?? true,
    },
  });
  return NextResponse.json({ post }, { status: 201 });
}
