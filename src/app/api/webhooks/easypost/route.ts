// POST /api/webhooks/easypost — receives carrier tracking updates from EasyPost.
// Configure this URL in your EasyPost dashboard (Webhooks). When a package moves,
// EasyPost calls us and we update the order automatically.
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Verify the request really came from EasyPost. EasyPost signs the raw body with
// HMAC-SHA256 using the secret you set in their dashboard, sent as a hex digest in
// the `X-Hmac-Signature` header (format: "hmac-sha256-hex=<digest>").
// If no secret is configured (local/simulation mode), we skip verification so dev works.
function verifySignature(raw: string, header: string | null): boolean {
  const secret = process.env.EASYPOST_WEBHOOK_SECRET || "";
  if (!secret) return true; // not configured — dev/sim mode
  if (!header) return false;
  const expected = "hmac-sha256-hex=" + crypto.createHmac("sha256", secret).update(raw, "utf8").digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-hmac-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let payload: any = null;
  try { payload = JSON.parse(raw); } catch { payload = null; }
  // EasyPost tracker events: { result: { object: "Tracker", tracking_code, status } }
  const result = payload?.result ?? payload;
  const trackingCode: string | undefined = result?.tracking_code;
  const status: string | undefined = result?.status;
  if (!trackingCode || !status) return NextResponse.json({ ok: true, ignored: true });

  const item = await prisma.orderItem.findFirst({ where: { trackingNumber: trackingCode } });
  if (!item) return NextResponse.json({ ok: true, unmatched: true });

  // Map carrier status -> our fulfillment status.
  const s = status.toLowerCase();
  let fulfillment = item.fulfillmentStatus;
  if (s === "delivered") fulfillment = "DELIVERED";
  else if (["in_transit", "out_for_delivery", "pre_transit"].includes(s)) fulfillment = "SHIPPED";

  if (fulfillment !== item.fulfillmentStatus) {
    await prisma.orderItem.update({ where: { id: item.id }, data: { fulfillmentStatus: fulfillment } });
    if (fulfillment === "DELIVERED") {
      const remaining = await prisma.orderItem.count({ where: { orderId: item.orderId, fulfillmentStatus: { not: "DELIVERED" } } });
      if (remaining === 0) await prisma.order.update({ where: { id: item.orderId }, data: { status: "DELIVERED" } });
    }
  }
  return NextResponse.json({ ok: true });
}
