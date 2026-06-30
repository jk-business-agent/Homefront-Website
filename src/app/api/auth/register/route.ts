// POST /api/auth/register — create a buyer or seller account and log them in.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";
import { rateLimit, clientIp, isBot } from "@/lib/rate-limit";
import { checkPasswordStrength } from "@/lib/password";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["BUYER", "SELLER"]).default("BUYER"),
  storeName: z.string().min(1).optional(), // required when role = SELLER
  website: z.string().optional(), // honeypot — real users leave this blank
});

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function POST(req: NextRequest) {
  // Anti-abuse: cap signups per IP. Generous enough for real bursts, low enough to stop bots.
  if (!rateLimit("register", clientIp(req), 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many sign-ups from this network. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (isBot(body)) {
    // Silently accept-looking failure so bots don't learn they were caught.
    return NextResponse.json({ error: "Could not create account" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  const { name, email, password, role, storeName } = parsed.data;

  const weak = checkPasswordStrength(password);
  if (weak) return NextResponse.json({ error: weak }, { status: 400 });

  if (role === "SELLER" && !storeName) {
    return NextResponse.json({ error: "Store name is required for seller accounts" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password), role },
  });

  // Sellers get a store created automatically.
  if (role === "SELLER" && storeName) {
    let slug = slugify(storeName);
    if (await prisma.store.findUnique({ where: { slug } })) slug = `${slug}-${user.id.slice(0, 5)}`;
    // New sellers start pending — an admin approves them before their products go live.
    await prisma.store.create({ data: { name: storeName, slug, ownerId: user.id, approved: false } });
  }

  const sessionUser = { id: user.id, email: user.email, name: user.name, role: user.role };
  await createSession(sessionUser);
  return NextResponse.json({ user: sessionUser }, { status: 201 });
}
