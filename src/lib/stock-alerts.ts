// Notify everyone who asked, when a product is back in stock. Best-effort.
import { prisma } from "./prisma";
import { sendEmail, brandEmail } from "./email";

export async function notifyBackInStock(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { stockQty: true, name: true, slug: true, active: true, store: { select: { approved: true } } },
  });
  if (!product || product.stockQty <= 0 || !product.active || !product.store.approved) return;

  const alerts = await prisma.stockAlert.findMany({ where: { productId, notifiedAt: null } });
  if (!alerts.length) return;

  const url = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/products/${product.slug}`;
  for (const a of alerts) {
    sendEmail({
      to: a.email,
      subject: `🔔 ${product.name} is back in stock!`,
      html: brandEmail("It's back! 🔔", `<p>Good news — <strong>${product.name}</strong> is back in stock at Homefront Markets. Grab it before it's gone again.</p>`, { label: "Shop it now", url }),
    }).catch(() => {});
  }
  await prisma.stockAlert.updateMany({ where: { productId, notifiedAt: null }, data: { notifiedAt: new Date() } });
}
