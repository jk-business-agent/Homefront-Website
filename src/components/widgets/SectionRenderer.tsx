// Maps a stored Section (type + config) to its rendered widget.
import { getWidget, widgetConfig } from "@/lib/widgets";
import { cld } from "@/lib/img";
import type { PageCtx } from "@/lib/page-types";
import * as W from "./Widgets";

const COMPONENTS: Record<string, any> = {
  hero: W.HeroWidget,
  promoStrip: W.PromoStripWidget,
  newsletterFeature: W.NewsletterFeatureWidget,
  newsletterSignup: W.NewsletterSignupWidget,
  newsletterHero: W.NewsletterHeroWidget,
  smsOptIn: W.SmsOptInWidget,
  featuredProducts: W.FeaturedProductsWidget,
  recommended: W.RecommendedWidget,
  recentlyViewed: W.RecentlyViewedWidget,
  storyStrip: W.StoryStripWidget,
  categoryChips: W.CategoryChipsWidget,
  shopGrid: W.ShopGridWidget,
  richText: W.RichTextWidget,
  imageText: W.ImageTextWidget,
  trustBadges: W.TrustBadgesWidget,
  relatedProducts: W.RelatedProductsWidget,
  pageHeader: W.PageHeaderWidget,
  featureCards: W.FeatureCardsWidget,
  vendorsList: W.VendorsListWidget,
};

export type SectionData = { id: string; type: string; config: string | null; enabled: boolean };

export default async function SectionRenderer({ section, ctx }: { section: SectionData; ctx: PageCtx }) {
  if (!section.enabled) return null;
  const def = getWidget(section.type);
  const Comp = COMPONENTS[section.type];
  if (!def || !Comp) return null;

  const cfg = widgetConfig(section.type, section.config);
  // Landing-only widgets (hero, newsletter feature, etc., or any section the admin
  // flags) are hidden once the visitor starts browsing a category or searching.
  const landingOnly = def.landingOnly || cfg.landingOnly;
  if (landingOnly && !ctx.showHero) return null;

  const widget = <Comp cfg={cfg} ctx={ctx} />;

  // Optional admin-chosen background (color and/or image) behind this section.
  const hasBg = !!(cfg.bgColor || cfg.bgImage);
  if (!hasBg) return widget;

  const overlay = Math.max(0, Math.min(70, Number(cfg.bgOverlay) || 0));
  const textClass = cfg.textColor === "light" ? "section-bg-light" : cfg.textColor === "dark" ? "section-bg-dark" : "";
  const style: React.CSSProperties = {};
  if (cfg.bgColor) style.backgroundColor = cfg.bgColor;
  if (cfg.bgImage) {
    // Serve an optimized, sized background via Cloudinary when applicable.
    style.backgroundImage = `url("${cld(cfg.bgImage, "f_auto,q_auto,c_fill,w_1800")}")`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
  }

  return (
    <div className={`section-bg ${textClass}`} style={style}>
      {overlay > 0 && <div className="section-bg-overlay" style={{ background: `rgba(0,0,0,${overlay / 100})` }} />}
      <div className="section-bg-inner">{widget}</div>
    </div>
  );
}
