"use client";
// Wraps the whole app: login + cart + favorites state, plus the persistent
// header, footer, newsletter band, cart, popup, and support widget.
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { FavoritesProvider } from "@/lib/favorites-context";
import type { SiteSettings } from "@/lib/settings";
import Header from "./Header";
import Footer from "./Footer";
import CartDrawer from "./CartDrawer";
import WelcomePopup from "./WelcomePopup";
import NewsletterBand from "./NewsletterBand";
import SupportWidget from "./SupportWidget";

export default function Providers({ children, settings, announcement, announcementLink }: { children: React.ReactNode; settings: SiteSettings; announcement?: string; announcementLink?: string | null }) {
  return (
    <AuthProvider>
      <CartProvider>
        <FavoritesProvider>
          <Header announcement={announcement ?? settings.announcement} announcementLink={announcementLink ?? null} />
          <main style={{ minHeight: "60vh" }}>{children}</main>
          <NewsletterBand />
          <Footer tagline={settings.footerTagline} />
          <CartDrawer />
          {settings.popupEnabled && <WelcomePopup />}
          <SupportWidget />
        </FavoritesProvider>
      </CartProvider>
    </AuthProvider>
  );
}
