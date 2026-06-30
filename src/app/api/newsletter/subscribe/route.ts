// POST /api/newsletter/subscribe — add an email to the newsletter list.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp, isBot } from "@/lib/rate-limit";
import { beehiivSubscribe } from "@/lib/beehiiv";
import { getWelcomeOffer } from "@/lib/coupons";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
  source: z.enum(["popup", "page", "footer", "checkout"]).default("popup"),
  website: z.string().optional(), // honeypot
});

export async function POST(req: NextRequest) {
  if (!rateLimit("newsletter", clientIp(req), 20, 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  if (isBot(body)) return NextResponse.json({ ok: true }); // swallow bots quietly
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  const { email, source } = parsed.data;

  const offer = await getWelcomeOffer(); // welcome discount to reward signups

  // Already subscribed locally? Treat as success — but still (re)sync to beehiiv.
  const existing = await prisma.subscriber.findUnique({ where: { email } });
  if (existing) {
    await beehiivSubscribe(email, source); // best-effort, no-op without keys
    return NextResponse.json({ ok: true, alreadySubscribed: true, ...(offer || {}) });
  }

  await prisma.subscriber.create({ data: { email, source } });
  await beehiivSubscribe(email, source); // mirror into your beehiiv audience
  return NextResponse.json({ ok: true, ...(offer || {}) }, { status: 201 });
}
