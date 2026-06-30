// Site-wide customization settings. Always returns the single row (creates defaults if missing).
import { prisma } from "./prisma";

export type SiteSettings = {
  announcement: string;
  announcementEnabled: boolean;
  announcementLink: string | null;
  announcementStart: Date | null;
  announcementEnd: Date | null;
  heroHeadline: string;
  heroSubtext: string;
  heroCtaText: string;
  accentColor: string;
  primaryColor: string;
  headingFont: string;
  bodyFont: string;
  footerTagline: string;
  popupEnabled: boolean;
};

export async function getSettings(): Promise<SiteSettings> {
  let s = await prisma.siteSettings.findFirst();
  if (!s) s = await prisma.siteSettings.create({ data: { id: "main" } });
  return {
    announcement: s.announcement,
    announcementEnabled: s.announcementEnabled,
    announcementLink: s.announcementLink,
    announcementStart: s.announcementStart,
    announcementEnd: s.announcementEnd,
    heroHeadline: s.heroHeadline,
    heroSubtext: s.heroSubtext,
    heroCtaText: s.heroCtaText,
    accentColor: s.accentColor,
    primaryColor: s.primaryColor,
    headingFont: s.headingFont,
    bodyFont: s.bodyFont,
    footerTagline: s.footerTagline,
    popupEnabled: s.popupEnabled,
  };
}

// Whether the announcement bar should show right now (enabled + within schedule).
export function announcementActive(s: SiteSettings, now = new Date()): boolean {
  if (!s.announcementEnabled || !s.announcement.trim()) return false;
  if (s.announcementStart && now < s.announcementStart) return false;
  if (s.announcementEnd && now > s.announcementEnd) return false;
  return true;
}
