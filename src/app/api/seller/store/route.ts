// The seller's own store profile (incl. business legal / W-9 info).
//   GET   /api/seller/store — returns store; the tax ID is masked (last 4 only)
//   PATCH /api/seller/store — update profile, ship-from, and legal/tax info
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSeller } from "@/lib/auth";
import { encryptField, decryptField } from "@/lib/crypto";

export const dynamic = "force-dynamic";

function maskTaxId(taxId: string | null): string | null {
  if (!taxId) return null;
  const digits = (decryptField(taxId) || "").replace(/\D/g, "");
  return digits.length >= 4 ? `••• •• ${digits.slice(-4)}` : "••••";
}

export async function GET() {
  let user;
  try { user = await requireSeller(); } catch { return NextResponse.json({ error: "Seller access required" }, { status: 401 }); }
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return NextResponse.json({ store: null });
  // Never return the raw tax ID — only a masked version.
  const { taxId, ...rest } = store;
  return NextResponse.json({ store: { ...rest, taxIdMasked: maskTaxId(taxId), taxIdOnFile: !!taxId } });
}

const schema = z.object({
  name: z.string().min(1).optional(),
  bio: z.string().optional(),
  story: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  employees: z.number().int().nonnegative().nullable().optional(),
  foundedYear: z.number().int().min(1700).max(2100).nullable().optional(),
  shipFromLine1: z.string().optional(),
  shipFromCity: z.string().optional(),
  shipFromState: z.string().optional(),
  shipFromZip: z.string().optional(),
  // Legal / W-9
  legalName: z.string().optional(),
  businessType: z.string().optional(),
  taxIdType: z.enum(["EIN", "SSN"]).optional(),
  taxId: z.string().optional(),
  legalLine1: z.string().optional(),
  legalCity: z.string().optional(),
  legalState: z.string().optional(),
  legalZip: z.string().optional(),
  w9Certify: z.boolean().optional(), // checkbox: certifies the W-9 is correct
  w9Name: z.string().optional(),
  onboardingComplete: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  let user;
  try { user = await requireSeller(); } catch { return NextResponse.json({ error: "Seller access required" }, { status: 401 }); }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { w9Certify, taxId, ...rest } = parsed.data;
  const data: any = { ...rest };
  // Only overwrite the tax ID if a new, real value is provided (ignore the masked placeholder).
  // Encrypt it at rest — the raw value is never stored in plaintext.
  if (taxId && !taxId.includes("•")) data.taxId = encryptField(taxId.trim());
  if (w9Certify) data.w9AcceptedAt = new Date();

  const store = await prisma.store.update({ where: { ownerId: user.id }, data });
  const { taxId: _t, ...out } = store;
  return NextResponse.json({ store: { ...out, taxIdMasked: maskTaxId(store.taxId), taxIdOnFile: !!store.taxId } });
}
