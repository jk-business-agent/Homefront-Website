import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, stores, posts, pages] = await Promise.all([
    prisma.product.findMany({ where: { active: true, store: { approved: true } }, select: { slug: true, createdAt: true } }),
    prisma.store.findMany({ where: { approved: true }, select: { slug: true } }),
    prisma.post.findMany({ where: { published: true }, select: { slug: true, createdAt: true } }),
    prisma.page.findMany({ where: { published: true }, select: { key: true, updatedAt: true } }),
  ]);
  const u = (p: string) => `${SITE}${p}`;
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = ["/", "/vendors", "/about", "/newsletter", "/privacy", "/terms"].map((p) => ({ url: u(p), lastModified: now, changeFrequency: "weekly", priority: p === "/" ? 1 : 0.6 }));

  return [
    ...staticRoutes,
    ...products.map((p) => ({ url: u(`/products/${p.slug}`), lastModified: p.createdAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...stores.map((s) => ({ url: u(`/store/${s.slug}`), lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...posts.map((p) => ({ url: u(`/newsletter/${p.slug}`), lastModified: p.createdAt, changeFrequency: "monthly" as const, priority: 0.5 })),
    ...pages.filter((p) => p.key !== "home" && p.key !== "product-template").map((p) => ({ url: u(`/p/${p.key}`), lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
