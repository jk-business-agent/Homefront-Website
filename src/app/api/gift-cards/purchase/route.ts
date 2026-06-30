// POST /api/gift-cards/purchase — buy a digital gift card (payment simulated until
// Stripe). Creates a code and emails it to the recipient.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { sendEmail, brandEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const schema = z.object({
  amountCents: z.number().int().min(500, "Minimum $5").max(50000, "Maximum $500"),
  recipientEmail: z.string().email("Enter a valid recipient email"),
  senderName: z.string().max(80).optional(),
  message: z.string().max(300).optional(),
});

function makeCode(): string {
  const h = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `HFGC-${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8)}`;
}

export async function POST(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "Please sign in" }, { status: 401 }); }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  const { amountCents, recipientEmail, senderName, message } = parsed.data;

  const code = makeCode();
  await prisma.giftCard.create({
    data: { code, initialCents: amountCents, balanceCents: amountCents, recipientEmail: recipientEmail.toLowerCase().trim(), senderName: senderName || user.name, message: message || null, purchaserId: user.id },
  });

  const amt = (amountCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  sendEmail({
    to: recipientEmail,
    subject: `🎁 You've got a ${amt} Homefront Markets gift card!`,
    html: brandEmail(`You've received a ${amt} gift card! 🎁`, `
      <p>${senderName || user.name} sent you a Homefront Markets gift card.</p>
      ${message ? `<p style="font-style:italic">"${message}"</p>` : ""}
      <p>Your code: <strong style="font-size:18px;letter-spacing:1px">${code}</strong></p>
      <p>Redeem it in your account to add ${amt} of store credit — it applies automatically at checkout.</p>`,
      { label: "Redeem your gift card", url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/account/credit` }),
  }).catch(() => {});

  return NextResponse.json({ ok: true, code, amountCents }, { status: 201 });
}
