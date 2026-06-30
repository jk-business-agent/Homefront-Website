// PATCH /api/admin/returns/[id] — resolve a return: refund (optionally restock) or reject.
//   body: { action: "refund" | "reject", restock?: boolean, adminNote?: string }
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendEmail, brandEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["refund", "reject"]),
  restock: z.boolean().optional(),
  adminNote: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const ret = await prisma.returnRequest.findUnique({ where: { id } });
  if (!ret) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ret.status !== "REQUESTED") return NextResponse.json({ error: "This return has already been resolved." }, { status: 400 });

  if (parsed.data.action === "reject") {
    const updated = await prisma.returnRequest.update({ where: { id }, data: { status: "REJECTED", adminNote: parsed.data.adminNote ?? null, resolvedAt: new Date() } });
    await logAudit(admin, "return.reject", `${ret.productName} — ${ret.reason.slice(0, 40)}`);
    return NextResponse.json({ returnRequest: updated });
  }

  // Refund as STORE CREDIT (payments simulated). Optionally restock the item.
  const restock = parsed.data.restock ?? ret.restock;
  await prisma.$transaction(async (tx) => {
    if (restock) {
      const item = await tx.orderItem.findUnique({ where: { id: ret.orderItemId } });
      if (item) {
        await tx.product.update({ where: { id: item.productId }, data: { stockQty: { increment: item.quantity } } });
        if (item.size) await tx.productVariant.updateMany({ where: { productId: item.productId, size: item.size }, data: { stockQty: { increment: item.quantity } } });
      }
    }
    // Credit the buyer's account with the refund amount.
    await tx.user.update({ where: { id: ret.userId }, data: { storeCreditCents: { increment: ret.refundCents } } });
    await tx.returnRequest.update({ where: { id }, data: { status: "REFUNDED", restock, adminNote: parsed.data.adminNote ?? null, resolvedAt: new Date() } });
  });
  await logAudit(admin, "return.refund", `${ret.productName} — $${(ret.refundCents / 100).toFixed(2)} store credit${restock ? " (restocked)" : ""}`);

  const buyer = await prisma.user.findUnique({ where: { id: ret.userId }, select: { email: true, name: true, storeCreditCents: true } });
  if (buyer) {
    const amt = (ret.refundCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
    const bal = (buyer.storeCreditCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
    sendEmail({
      to: buyer.email,
      subject: `Your return was approved — ${amt} store credit added`,
      html: brandEmail("Your refund is ready 🎉", `
        <p>Hi ${buyer.name.split(" ")[0]}, your return for <strong>${ret.productName}</strong> was approved.</p>
        <p>We've added <strong>${amt}</strong> in store credit to your account. Your balance is now <strong>${bal}</strong> — it'll apply automatically at checkout.</p>`,
        { label: "Shop with your credit", url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/` }),
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true, refunded: true, creditedCents: ret.refundCents });
}
