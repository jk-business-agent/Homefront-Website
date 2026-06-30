// Data helpers for CMS pages.
import { prisma } from "@/lib/prisma";

export async function getPage(key: string) {
  return prisma.page.findUnique({
    where: { key },
    include: { sections: { orderBy: { order: "asc" } } },
  });
}

// Published pages that asked to appear in the top navigation.
export async function getNavPages() {
  return prisma.page.findMany({
    where: { published: true, showInNav: true },
    orderBy: { navOrder: "asc" },
    select: { key: true, title: true, navLabel: true },
  });
}
