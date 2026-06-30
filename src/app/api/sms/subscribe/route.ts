// POST /api/sms/subscribe — collect a consented phone number for SMS marketing.
// Provider-agnostic: stores the number + proof of consent so you can export/sync to
// whatever SMS service you choose. Requires explicit consent (TCPA).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp, isBot } from "@/lib/rate-limit";
import { SMS_CONSENT_TEXT, normalizePhone } from "@/lib/sms";

export const dynamic = "force-dynamic";

const schema = z.object({
  phone: z.string().min(7),
  consent: z.boolean(),
  source: z.enum(["landing", "checkout", "popup", "footer"]).default("landing"),
  website: z.string().optional(), // honeypot
});

export async function POST(req: NextRequest) {
  if (!rateLimit("sms", clientIp(req), 20, 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  if (isBot(body)) return NextResponse.json({ ok: true }); // swallow bots
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });

  // Consent is mandatory — never store a number without it.
  if (!parsed.data.consent) {
    return NextResponse.json({ error: "Please check the box to agree to receive texts." }, { status: 400 });
  }
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return NextResponse.json({ error: "Enter a valid 10-digit U.S. phone number." }, { status: 400 });

  const existing = await prisma.smsSubscriber.findUnique({ where: { phone } });
  if (existing) return NextResponse.json({ ok: true, alreadySubscribed: true });

  await prisma.smsSubscriber.create({
    data: {
      phone,
      consent: true,
      consentText: SMS_CONSENT_TEXT,
      source: parsed.data.source,
      ip: clientIp(req),
      userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
