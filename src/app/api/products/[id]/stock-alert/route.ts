// POST /api/products/[id]/stock-alert — "email me when this is back in stock".
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, clientIp, isBot } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().email("Enter a valid email"), website: z.string().optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!rateLimit("stockalert", clientIp(req), 20, 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }
  const { id: productId } = await params;
  const body = await req.json().catch(() => null);
  if (isBot(body)) return NextResponse.json({ ok: true });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const user = await getCurrentUser();
  const email = parsed.data.email.toLowerCase().trim();
  // One alert per product+email; resubscribing re-arms it.
  await prisma.stockAlert.upsert({
    where: { productId_email: { productId, email } },
    update: { notifiedAt: null, userId: user?.id ?? null },
    create: { productId, email, userId: user?.id ?? null },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
