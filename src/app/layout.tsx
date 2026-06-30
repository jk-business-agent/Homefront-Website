import type { Metadata } from "next";
import { Oswald, Cabin } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { getSettings, announcementActive } from "@/lib/settings";
import { headingStack, bodyStack } from "@/lib/theme";

export const dynamic = "force-dynamic";

// Oswald = bold condensed headings (close to the logo's lettering).
// Cabin = warm, readable body text (and a fitting name for a cabin brand).
const oswald = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-head", display: "swap" });
const cabin = Cabin({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const DESCRIPTION = "Shop verified American-made goods from makers across all 50 states — from work boots to hand tools. Every order supports U.S. workers, farms, and family shops.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Homefront Markets — American-Made Marketplace",
    template: "%s · Homefront Markets",
  },
  description: DESCRIPTION,
  keywords: ["American made", "made in USA", "marketplace", "American makers", "shop local", "US manufacturing"],
  applicationName: "Homefront Markets",
  openGraph: {
    type: "website",
    siteName: "Homefront Markets",
    title: "Homefront Markets — American-Made Marketplace",
    description: DESCRIPTION,
    images: [{ url: "/logo.png", width: 1254, height: 1254, alt: "Homefront Markets" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Homefront Markets — American-Made Marketplace",
    description: DESCRIPTION,
    images: ["/logo.png"],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();

  // Apply admin-chosen theme via CSS variables. Fonts only override when a
  // non-default option is picked (defaults keep the loaded brand fonts).
  const themeVars: Record<string, string> = {
    "--amber": settings.accentColor,
    "--navy": settings.primaryColor,
  };
  const hStack = headingStack(settings.headingFont);
  const bStack = bodyStack(settings.bodyFont);
  if (hStack) themeVars["--font-head"] = hStack;
  if (bStack) themeVars["--font-body"] = bStack;

  const annActive = announcementActive(settings);

  return (
    <html lang="en" className={`${oswald.variable} ${cabin.variable}`}>
      <body style={themeVars as any}>
        <Providers
          settings={settings}
          announcement={annActive ? settings.announcement : ""}
          announcementLink={annActive ? settings.announcementLink : null}
        >
          {children}
        </Providers>
      </body>
    </html>
  );
}
