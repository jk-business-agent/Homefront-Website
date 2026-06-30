// Widget registry — the single source of truth for every page-builder widget.
// Each entry declares its editable fields (which drive the admin form) and the
// default config. Adding a new widget = add an entry here + a renderer component.

export type FieldType = "text" | "textarea" | "number" | "boolean" | "select" | "url";

export type WidgetField = {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[]; // for select
  placeholder?: string;
  help?: string;
  showIf?: { key: string; equals: string }; // conditionally show this field
};

export type WidgetDef = {
  type: string;
  label: string;
  icon: string;
  description: string;
  fields: WidgetField[];
  defaults: Record<string, any>;
  // Widgets that only make sense on the landing view (category = All, no search).
  // The renderer hides them when the visitor is browsing/searching.
  landingOnly?: boolean;
  // Widgets appropriate for the shared product-page template.
  productSafe?: boolean;
};

export const WIDGETS: WidgetDef[] = [
  {
    type: "hero",
    label: "Hero banner",
    icon: "🏔️",
    description: "Big headline, subtext and call-to-action at the top of the page.",
    landingOnly: true,
    fields: [
      { key: "headline", label: "Headline", type: "text" },
      { key: "subtext", label: "Sub-text", type: "textarea" },
      { key: "ctaText", label: "Button text", type: "text" },
      { key: "ctaHref", label: "Button link", type: "text", placeholder: "#shop" },
      { key: "secondaryText", label: "Second button text", type: "text" },
      { key: "secondaryHref", label: "Second button link", type: "text" },
      { key: "showBadges", label: "Show trust badges", type: "boolean" },
    ],
    defaults: {
      headline: "Shop American. Support the home front.",
      subtext: "A marketplace of products made by U.S. hands — from work boots to hand tools, all from verified American makers.",
      ctaText: "Start Shopping", ctaHref: "#shop",
      secondaryText: "Sell Your Made-in-USA Products", secondaryHref: "/sell",
      showBadges: true,
    },
  },
  {
    type: "promoStrip",
    label: "Promo strip",
    icon: "📣",
    description: "A slim colored banner for a promo or announcement.",
    productSafe: true,
    fields: [
      { key: "text", label: "Text", type: "text" },
      { key: "linkText", label: "Link text", type: "text" },
      { key: "linkHref", label: "Link", type: "text" },
      { key: "bg", label: "Background color", type: "text", placeholder: "#1f3a5f" },
    ],
    defaults: { text: "🇺🇸 Free shipping on orders over $75 — always from American warehouses.", linkText: "", linkHref: "", bg: "#1f3a5f" },
  },
  {
    type: "newsletterFeature",
    label: "Newsletter feature",
    icon: "📰",
    description: "Prominent newsletter signup with a link to the latest issue.",
    landingOnly: true,
    fields: [
      { key: "kicker", label: "Kicker", type: "text" },
      { key: "headline", label: "Headline", type: "text" },
      { key: "text", label: "Description", type: "textarea" },
      { key: "buttonLabel", label: "Button label", type: "text" },
    ],
    defaults: {
      kicker: "📰 The Homefront Dispatch",
      headline: "Join the movement. Get the newsletter.",
      text: "Maker spotlights, the stories behind your goods, and first dibs on new American-made drops. Free, every week.",
      buttonLabel: "Subscribe free",
    },
  },
  {
    type: "newsletterSignup",
    label: "Newsletter signup (compact)",
    icon: "✉️",
    description: "A simple inline email-capture box you can drop anywhere.",
    productSafe: true,
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "buttonLabel", label: "Button label", type: "text" },
    ],
    defaults: { heading: "📬 Get American-made picks in your inbox", buttonLabel: "Subscribe" },
  },
  {
    type: "newsletterHero",
    label: "Newsletter landing hero",
    icon: "📭",
    description: "A big, clean, centered “Join the newsletter” block with email signup — perfect for a dedicated subscribe page. Add a background image for impact.",
    fields: [
      { key: "kicker", label: "Small label on top", type: "text" },
      { key: "headline", label: "Big headline", type: "text" },
      { key: "subtext", label: "What it's about", type: "textarea" },
      { key: "buttonLabel", label: "Button label", type: "text" },
      { key: "perk1", label: "Perk 1 (optional)", type: "text" },
      { key: "perk2", label: "Perk 2 (optional)", type: "text" },
      { key: "perk3", label: "Perk 3 (optional)", type: "text" },
    ],
    defaults: {
      kicker: "📬 The Homefront Dispatch",
      headline: "Join the newsletter",
      subtext: "Maker stories, new American-made drops, and the people behind the products — straight to your inbox. Free, every week.",
      buttonLabel: "Subscribe free",
      perk1: "Weekly maker spotlights",
      perk2: "First dibs on new drops",
      perk3: "No spam — unsubscribe anytime",
    },
  },
  {
    type: "smsOptIn",
    label: "Text-deals signup (SMS)",
    icon: "📱",
    description: "A clean centered “Get text deals” block with a phone field + consent — for a dedicated SMS opt-in page. Add a background image for impact.",
    fields: [
      { key: "kicker", label: "Small label on top", type: "text" },
      { key: "headline", label: "Big headline", type: "text" },
      { key: "subtext", label: "What it's about", type: "textarea" },
      { key: "buttonLabel", label: "Button label", type: "text" },
      { key: "perk1", label: "Perk 1 (optional)", type: "text" },
      { key: "perk2", label: "Perk 2 (optional)", type: "text" },
      { key: "perk3", label: "Perk 3 (optional)", type: "text" },
    ],
    defaults: {
      kicker: "📱 Homefront Texts",
      headline: "Get exclusive deals by text",
      subtext: "Be first to know about new American-made drops, restocks, and members-only discounts — straight to your phone.",
      buttonLabel: "Text me deals",
      perk1: "Early access to drops",
      perk2: "Subscriber-only discounts",
      perk3: "Reply STOP anytime",
    },
  },
  {
    type: "featuredProducts",
    label: "Featured products",
    icon: "⭐",
    description: "A row of products — hand-picked or chosen automatically.",
    productSafe: true,
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      {
        key: "source", label: "Which products", type: "select",
        options: [
          { value: "featured_home", label: "Marked 'Featured on home'" },
          { value: "most_liked", label: "Most liked" },
          { value: "newest", label: "Newest" },
          { value: "top_rated", label: "Top rated" },
          { value: "category", label: "From a category" },
        ],
      },
      { key: "category", label: "Category name", type: "text", showIf: { key: "source", equals: "category" } },
      { key: "count", label: "How many", type: "number" },
      { key: "seeAllText", label: "'See all' link text", type: "text" },
      { key: "seeAllHref", label: "'See all' link", type: "text" },
    ],
    defaults: { heading: "⭐ Featured", source: "featured_home", category: "", count: 4, seeAllText: "", seeAllHref: "" },
  },
  {
    type: "recommended",
    label: "Recommended for you",
    icon: "🎯",
    description: "Personalized picks based on what the shopper has viewed.",
    landingOnly: true,
    fields: [{ key: "heading", label: "Heading", type: "text" }],
    defaults: { heading: "Recommended for you" },
  },
  {
    type: "recentlyViewed",
    label: "Recently viewed",
    icon: "🕘",
    description: "The shopper's last-viewed products (shown only when they have history).",
    landingOnly: true,
    fields: [{ key: "heading", label: "Heading", type: "text" }],
    defaults: { heading: "🕘 Recently viewed" },
  },
  {
    type: "storyStrip",
    label: "Newsletter stories",
    icon: "🗞️",
    description: "A grid of the latest newsletter articles.",
    landingOnly: true,
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "subtext", label: "Sub-text", type: "text" },
      { key: "buttonLabel", label: "Button label", type: "text" },
      { key: "count", label: "How many", type: "number" },
    ],
    defaults: { heading: "From the Homefront", subtext: "Stories from the makers behind the marketplace.", buttonLabel: "Read the newsletter", count: 3 },
  },
  {
    type: "categoryChips",
    label: "Shop-by-category chips",
    icon: "🗂️",
    description: "Clickable chips for each active storefront category.",
    fields: [{ key: "heading", label: "Heading", type: "text" }],
    defaults: { heading: "Shop by category" },
  },
  {
    type: "shopGrid",
    label: "Product grid (shop)",
    icon: "🛍️",
    description: "The main filterable product grid. Respects category, search and filters.",
    fields: [
      { key: "heading", label: "Heading (when not searching)", type: "text" },
      { key: "showFilters", label: "Show filter bar", type: "boolean" },
    ],
    defaults: { heading: "Featured American-made products", showFilters: true },
  },
  {
    type: "richText",
    label: "Text block",
    icon: "📝",
    description: "A heading and paragraph of text.",
    productSafe: true,
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "body", label: "Body text", type: "textarea" },
      { key: "align", label: "Alignment", type: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }] },
    ],
    defaults: { heading: "", body: "", align: "left" },
  },
  {
    type: "imageText",
    label: "Image + text",
    icon: "🖼️",
    description: "An image beside a heading, text and an optional button.",
    productSafe: true,
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "body", label: "Body text", type: "textarea" },
      { key: "imageUrl", label: "Image URL", type: "url", help: "Upload an image elsewhere and paste its URL, or leave blank for a placeholder." },
      { key: "imageSide", label: "Image side", type: "select", options: [{ value: "right", label: "Right" }, { value: "left", label: "Left" }] },
      { key: "ctaText", label: "Button text", type: "text" },
      { key: "ctaHref", label: "Button link", type: "text" },
    ],
    defaults: { heading: "Our story", body: "", imageUrl: "", imageSide: "right", ctaText: "", ctaHref: "" },
  },
  {
    type: "trustBadges",
    label: "Trust badges",
    icon: "🛡️",
    description: "The four 'why shop here' badges.",
    productSafe: true,
    fields: [{ key: "heading", label: "Heading (optional)", type: "text" }],
    defaults: { heading: "" },
  },
  {
    type: "pageHeader",
    label: "Page header",
    icon: "🪧",
    description: "A centered title and intro line for the top of a page.",
    productSafe: true,
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "subtext", label: "Intro text", type: "textarea" },
    ],
    defaults: { heading: "Page title", subtext: "" },
  },
  {
    type: "featureCards",
    label: "Feature cards",
    icon: "🔢",
    description: "A grid of small cards (icon + title + text). One card per line.",
    fields: [
      { key: "heading", label: "Heading (optional)", type: "text" },
      { key: "cards", label: "Cards — one per line as: emoji | title | text", type: "textarea", help: "Example:  🔎 | Verified | Every seller certifies U.S. origin." },
    ],
    defaults: { heading: "", cards: "🇺🇸 | Made in USA | Every product is American-made.\n🏭 | Direct from makers | Buy straight from U.S. shops.\n🤝 | Money stays home | Your dollars support U.S. jobs." },
  },
  {
    type: "vendorsList",
    label: "Vendor directory",
    icon: "🏪",
    description: "A grid of all approved makers/sellers, featured first.",
    fields: [{ key: "heading", label: "Heading (optional)", type: "text" }],
    defaults: { heading: "" },
  },
  {
    type: "relatedProducts",
    label: "Related products",
    icon: "🔗",
    description: "“You might also like” — popular products in the same category. (Product pages only.)",
    productSafe: true,
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "count", label: "How many", type: "number" },
    ],
    defaults: { heading: "You might also like", count: 4 },
  },
];

const BY_TYPE = new Map(WIDGETS.map((w) => [w.type, w]));

export function getWidget(type: string): WidgetDef | undefined {
  return BY_TYPE.get(type);
}

// Merge stored JSON config with a widget's defaults so renderers always get every key.
export function widgetConfig(type: string, raw: string | null | undefined): Record<string, any> {
  const def = BY_TYPE.get(type);
  let parsed: Record<string, any> = {};
  try { parsed = raw ? JSON.parse(raw) : {}; } catch { parsed = {}; }
  return { ...(def?.defaults ?? {}), ...parsed };
}
