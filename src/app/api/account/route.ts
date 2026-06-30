// DELETE /api/account — let a signed-in user permanently delete their own account
// and personal data (a privacy "right to erasure" / right to be forgotten).
//
// Accounts with a store or past orders are NOT self-deletable here: we're legally
// required to retain sales and tax records, and unwinding a seller's catalog/orders
// needs a human. Those users get a clear "contact support" path instead.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, clearSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE() {
  let session;
  try { session = await requireUser(); } catch { return NextResponse.json({ error: "Please sign in" }, { status: 401 }); }

  const userId = session.id;
  const store = await prisma.store.findUnique({ where: { ownerId: userId } });
  if (store) {
    return NextResponse.json(
      { error: "Seller accounts can't be self-deleted because of sales/tax record-keeping. Please contact support to close your store." },
      { status: 409 },
    );
  }
  const orderCount = await prisma.order.count({ where: { buyerId: userId } });
  if (orderCount > 0) {
    return NextResponse.json(
      { error: "Your account has order history we're required to keep for tax/legal reasons. Please contact support to request deletion." },
      { status: 409 },
    );
  }

  const reviews = await prisma.review.findMany({ where: { userId }, select: { productId: true } });
  const affectedProducts = [...new Set(reviews.map((r) => r.productId))];

  // Delete / anonymize everything tied to this user, in FK-safe order.
  await prisma.$transaction(async (tx) => {
    // Messages in this buyer's conversations, then the conversations.
    const convos = await tx.conversation.findMany({ where: { buyerId: userId }, select: { id: true } });
    const convoIds = convos.map((c) => c.id);
    if (convoIds.length) {
      await tx.message.deleteMany({ where: { conversationId: { in: convoIds } } });
      await tx.conversation.deleteMany({ where: { id: { in: convoIds } } });
    }
    await tx.review.deleteMany({ where: { userId } });
    await tx.favorite.deleteMany({ where: { userId } });
    await tx.address.deleteMany({ where: { userId } });
    // Anonymize records we keep for analytics/support history rather than deleting.
    await tx.productView.updateMany({ where: { userId }, data: { userId: null } });
    await tx.supportThread.updateMany({ where: { userId }, data: { userId: null } });
    // Remove from the newsletter list too.
    await tx.subscriber.deleteMany({ where: { email: session.email } });
    await tx.user.delete({ where: { id: userId } });
  });

  // Recompute ratings for products whose reviews we removed.
  for (const productId of affectedProducts) {
    const agg = await prisma.review.aggregate({ where: { productId }, _avg: { rating: true }, _count: true });
    await prisma.product.update({
      where: { id: productId },
      data: { rating: agg._count ? Math.round((agg._avg.rating ?? 0) * 10) / 10 : 0, reviewCount: agg._count },
    });
  }

  await clearSession();
  return NextResponse.json({ ok: true, deleted: true });
}
