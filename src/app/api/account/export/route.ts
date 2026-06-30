// GET /api/account/export — download everything we hold about the signed-in user
// as a single JSON file (a privacy "right to access" / data-portability export).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { decryptField } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  let session;
  try { session = await requireUser(); } catch { return NextResponse.json({ error: "Please sign in" }, { status: 401 }); }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      addresses: true,
      favorites: { include: { product: { select: { name: true, slug: true } } } },
      reviews: { include: { product: { select: { name: true, slug: true } } } },
      orders: { include: { items: { include: { product: { select: { name: true } } } } } },
      conversations: { include: { messages: true } },
      store: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Support threads link by optional userId.
  const supportThreads = await prisma.supportThread.findMany({
    where: { userId: user.id },
    include: { messages: true },
  });
  const subscriber = await prisma.subscriber.findUnique({ where: { email: user.email } });

  // Never include the password hash. Decrypt the store tax ID so the OWNER can see
  // their own number in their own export (it's their data); everything else stays as-is.
  const { passwordHash, store, ...profile } = user as any;
  const exportData = {
    exportedFor: user.email,
    note: "This is a copy of the personal data Homefront Markets holds about your account.",
    account: { ...profile },
    store: store ? { ...store, taxId: store.taxId ? decryptField(store.taxId) : null } : null,
    addresses: user.addresses,
    orders: user.orders,
    favorites: user.favorites,
    reviews: user.reviews,
    messages: user.conversations,
    supportThreads,
    newsletterSubscription: subscriber ? { email: subscriber.email, since: subscriber.createdAt } : null,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="homefront-my-data.json"`,
    },
  });
}
