// Seeds the database with demo sellers, products, and accounts.
// Run with: npm run db:seed   (or npm run db:reset to wipe + reseed)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/["'’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Each seller owns a store and a set of products.
const SELLERS = [
  {
    storeName: "Heartland Forge Co.",
    state: "Tennessee",
    bio: "Foundry-cast iron cookware made in South Pittsburg, TN.",
    products: [
      { name: 'Pre-Seasoned Cast Iron Skillet, 12"', cat: "Kitchen", price: 4999, emoji: "🍳", city: "South Pittsburg", state: "Tennessee", rating: 4.8, reviews: 2140, desc: "Foundry-cast in Tennessee from American iron. One pan that lasts generations — sears, bakes, and fries with even heat." },
    ],
  },
  {
    storeName: "Ironside Bootworks",
    state: "Maine",
    bio: "Hand-lasted leather boots and goods from Lewiston, ME.",
    products: [
      { name: "Heritage Leather Work Boots", cat: "Apparel", price: 21800, emoji: "🥾", city: "Lewiston", state: "Maine", rating: 4.9, reviews: 884, desc: "Hand-lasted in Maine with full-grain American leather and a Goodyear welt you can resole for life." },
      { name: "Leather Bifold Wallet", cat: "Apparel", price: 6400, emoji: "👛", city: "Lewiston", state: "Maine", rating: 4.8, reviews: 905, desc: "Cut from the same American leather as our boots and saddle-stitched by hand in Maine. Ages beautifully." },
    ],
  },
  {
    storeName: "Forge & Field",
    state: "Oregon",
    bio: "American-forged Damascus kitchen knives from Portland, OR.",
    products: [
      { name: 'Damascus Chef\'s Knife, 8"', cat: "Kitchen", price: 13900, emoji: "🔪", city: "Portland", state: "Oregon", rating: 4.7, reviews: 512, desc: "67-layer American-forged Damascus steel, hand-sharpened to a 15° edge. Balanced for all-day kitchen work." },
    ],
  },
  {
    storeName: "Liberty Mills Apparel",
    state: "North Carolina",
    bio: "Grown, spun, and sewn in the Carolinas.",
    products: [
      { name: "Organic Cotton Crew Tee", cat: "Apparel", price: 3200, emoji: "👕", city: "Burlington", state: "North Carolina", rating: 4.6, reviews: 1320, desc: "Grown, spun, cut, and sewn in the Carolinas. Heavyweight 100% U.S. organic cotton that softens with every wash." },
      { name: "Denim Trucker Jacket", cat: "Apparel", price: 12800, emoji: "🧥", city: "Greensboro", state: "North Carolina", rating: 4.7, reviews: 620, desc: "Cut from selvedge denim milled in the Carolinas. Copper rivets, chain-stitched seams, made to break in for years." },
    ],
  },
  {
    storeName: "Summit Steel Goods",
    state: "Colorado",
    bio: "Welded stainless drinkware and grill tools from Denver, CO.",
    products: [
      { name: "Stainless Insulated Water Bottle, 32oz", cat: "Outdoors", price: 3650, emoji: "🍶", city: "Denver", state: "Colorado", rating: 4.8, reviews: 3010, desc: "Double-walled American stainless. Keeps cold 24 hrs, hot 12 hrs. Welded and powder-coated in Colorado." },
      { name: "Stainless BBQ Grill Tool Set", cat: "Outdoors", price: 5200, emoji: "🍖", city: "Denver", state: "Colorado", rating: 4.7, reviews: 410, desc: "Heavy-gauge American stainless spatula, tongs, and fork with riveted handles. Built for serious grilling." },
    ],
  },
  {
    storeName: "Timber Lane Woodworks",
    state: "Vermont",
    bio: "Hardwood goods and pure maple syrup from Montpelier, VT.",
    products: [
      { name: "Solid Maple Cutting Board", cat: "Kitchen", price: 6800, emoji: "🪵", city: "Montpelier", state: "Vermont", rating: 4.9, reviews: 740, desc: "Edge-grain Vermont hard maple, finished with food-safe American beeswax oil. Built to take a lifetime of knife work." },
      { name: "Maple Syrup, Grade A Amber, 12oz", cat: "Pantry", price: 2200, emoji: "🥞", city: "Montpelier", state: "Vermont", rating: 4.9, reviews: 1240, desc: "Tapped and boiled in the Vermont sugarbush. Pure single-origin amber syrup, nothing added." },
    ],
  },
  {
    storeName: "Anvil Tool Works",
    state: "Ohio",
    bio: "Forged tools and power tools assembled in Akron, OH.",
    products: [
      { name: "Cordless Drill / Driver Kit", cat: "Tools", price: 15900, emoji: "🔩", city: "Akron", state: "Ohio", rating: 4.7, reviews: 1190, desc: "Brushless 20V drill assembled in Ohio with U.S.-wound motors. Two batteries, charger, and hard case included." },
      { name: "Garden Hand Tool Set", cat: "Tools", price: 7400, emoji: "🌱", city: "Akron", state: "Ohio", rating: 4.6, reviews: 288, desc: "Forged American steel heads with U.S. ash handles. Trowel, fork, and cultivator built to outlive the garden." },
    ],
  },
  {
    storeName: "North Star Textiles",
    state: "Montana",
    bio: "Wool goods woven on heritage looms in Bozeman, MT.",
    products: [
      { name: "Wool Blend Camp Blanket", cat: "Outdoors", price: 9400, emoji: "🧣", city: "Bozeman", state: "Montana", rating: 4.8, reviews: 430, desc: "Woven on heritage looms in Montana from American wool. Warm, rugged, and made to outlast the trail." },
    ],
  },
  {
    storeName: "Prairie Light Candle Co.",
    state: "Iowa",
    bio: "Hand-poured beeswax candles from Des Moines, IA.",
    products: [
      { name: "Beeswax Candle Trio", cat: "Home", price: 4200, emoji: "🕯️", city: "Des Moines", state: "Iowa", rating: 4.9, reviews: 980, desc: "100% American beeswax, cotton wicks, hand-poured in small batches in Iowa. Clean burn, honey-warm glow." },
    ],
  },
  {
    storeName: "Kiln & Clay Studio",
    state: "Washington",
    bio: "Wheel-thrown stoneware from Seattle, WA.",
    products: [
      { name: "Stoneware Coffee Mug Set (4)", cat: "Home", price: 5800, emoji: "☕", city: "Seattle", state: "Washington", rating: 4.8, reviews: 355, desc: "Wheel-thrown and glazed in the Pacific Northwest. Microwave and dishwasher safe, no two exactly alike." },
    ],
  },
  {
    storeName: "Golden Acre Apiary",
    state: "Georgia",
    bio: "Single-source raw honey from Savannah, GA.",
    products: [
      { name: "Raw Wildflower Honey, 16oz", cat: "Pantry", price: 1800, emoji: "🍯", city: "Savannah", state: "Georgia", rating: 4.9, reviews: 1670, desc: "Single-source raw honey from Georgia wildflower fields. Unfiltered, unpasteurized, jarred on the farm." },
    ],
  },
];

async function main() {
  console.log("Clearing existing data...");
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.productView.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.returnRequest.deleteMany();
  await prisma.question.deleteMany();
  await prisma.review.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.store.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();
  await prisma.subscriber.deleteMany();
  await prisma.smsSubscriber.deleteMany();
  await prisma.stockAlert.deleteMany();
  await prisma.giftCard.deleteMany();
  await prisma.post.deleteMany();
  await prisma.category.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.section.deleteMany();
  await prisma.page.deleteMany();

  // Demo coupons
  await prisma.coupon.create({ data: { code: "USA10", type: "PERCENT", value: 10 } });
  await prisma.coupon.create({ data: { code: "HOMEFRONT5", type: "FIXED", value: 500, minSubtotalCents: 2500 } });
  // Welcome discount handed to new newsletter subscribers.
  await prisma.coupon.create({ data: { code: "WELCOME10", type: "PERCENT", value: 10 } });

  // Storefront categories (admin-managed). Kitchen & Pantry start inactive.
  const CATS = [
    { name: "Apparel", active: true }, { name: "Tools", active: true },
    { name: "Outdoors", active: true }, { name: "Home", active: true },
    { name: "Kitchen", active: false }, { name: "Pantry", active: false },
  ];
  for (let i = 0; i < CATS.length; i++) {
    await prisma.category.create({ data: { name: CATS[i].name, slug: slugify(CATS[i].name), sortOrder: i, active: CATS[i].active } });
  }

  const password = await bcrypt.hash("password123", 10);

  // A demo buyer account
  const buyer = await prisma.user.create({
    data: { email: "buyer@demo.com", passwordHash: password, name: "Demo Buyer", role: "BUYER" },
  });
  console.log("Created buyer: buyer@demo.com / password123");

  // Platform/support account ("us" in the 3-way chat)
  const admin = await prisma.user.create({
    data: { email: "admin@demo.com", passwordHash: password, name: "Homefront Support", role: "ADMIN" },
  });
  console.log("Created admin: admin@demo.com / password123");

  // Create each seller + their store + products
  let sellerIndex = 0;
  for (const s of SELLERS) {
    sellerIndex++;
    const owner = await prisma.user.create({
      data: {
        email: `seller${sellerIndex}@demo.com`,
        passwordHash: password,
        name: s.storeName,
        role: "SELLER",
      },
    });
    const storeCity = s.products[0]?.city ?? null;
    const employees = sellerIndex * 6 + 9; // believable, deterministic
    const foundedYear = 1972 + sellerIndex * 3;
    const story =
      `${s.storeName} is a family-run American maker based in ${storeCity ?? "the USA"}, ${s.state}. ` +
      `${s.bio} We employ ${employees} people locally, and every order keeps our workshop humming. ` +
      `When you buy from us, you're helping keep America working — that's the whole point.`;
    const zipByState: Record<string, string> = {
      Tennessee: "37380", Maine: "04240", Oregon: "97201", "North Carolina": "27215",
      Colorado: "80201", Vermont: "05601", Ohio: "44301", Montana: "59715",
      Iowa: "50301", Washington: "98101", Georgia: "31401",
    };
    const store = await prisma.store.create({
      data: {
        name: s.storeName,
        slug: slugify(s.storeName),
        bio: s.bio,
        story,
        city: storeCity,
        state: s.state,
        employees,
        foundedYear,
        shipFromLine1: "1 Maker Way",
        shipFromCity: storeCity,
        shipFromState: s.state,
        shipFromZip: zipByState[s.state] || "10001",
        // Demo W-9 / legal info on file
        legalName: `${s.storeName} LLC`,
        businessType: "LLC",
        taxIdType: "EIN",
        taxId: `87-65432${String(sellerIndex).padStart(2, "0")}`,
        legalLine1: "1 Maker Way",
        legalCity: storeCity,
        legalState: s.state,
        legalZip: zipByState[s.state] || "10001",
        w9Name: s.storeName,
        w9AcceptedAt: new Date(),
        onboardingComplete: true,
        ownerId: owner.id,
      },
    });

    // Per-category shipping weight (oz) for a believable seller experience.
    const weightByCat: Record<string, number> = {
      Apparel: 14, Tools: 80, Outdoors: 32, Home: 24, Kitchen: 96, Pantry: 18,
    };
    for (const p of s.products) {
      const isApparelSized = p.cat === "Apparel" && /(tee|shirt|jacket)/i.test(p.name);
      const sizeList = isApparelSized ? ["S", "M", "L", "XL", "XXL"] : [];
      const sizeStock: Record<string, number> = { S: 8, M: 20, L: 18, XL: 10, XXL: 4 };
      const totalStock = isApparelSized ? sizeList.reduce((n, sz) => n + (sizeStock[sz] ?? 0), 0) : 100;
      const created = await prisma.product.create({
        data: {
          name: p.name,
          slug: slugify(p.name),
          description: p.desc,
          priceCents: p.price,
          category: p.cat,
          emoji: p.emoji,
          madeInCity: p.city,
          madeInState: p.state,
          rating: p.rating,
          reviewCount: p.reviews,
          likeCount: Math.round(p.reviews / 9),
          stockQty: totalStock,
          weightOz: weightByCat[p.cat] ?? 24,
          shippingPriceCents: 0, // free U.S. shipping is the brand promise
          sizes: isApparelSized ? sizeList.join(",") : null,
          // Kitchen & Pantry are hidden "for now" per the catalog plan.
          active: !["Kitchen", "Pantry"].includes(p.cat),
          storeId: store.id,
        },
      });
      if (isApparelSized) {
        for (const sz of sizeList) {
          await prisma.productVariant.create({ data: { productId: created.id, size: sz, stockQty: sizeStock[sz] ?? 0 } });
        }
      }
    }
    console.log(`Created seller: seller${sellerIndex}@demo.com / password123  (store: ${s.storeName})`);
  }

  // A few extra customers to author reviews
  const reviewerNames = ["Sarah M.", "Mike T.", "Jenna R.", "Carl B."];
  const reviewers = [buyer];
  for (let i = 0; i < reviewerNames.length; i++) {
    reviewers.push(
      await prisma.user.create({
        data: { email: `customer${i + 1}@demo.com`, passwordHash: password, name: reviewerNames[i], role: "BUYER" },
      })
    );
  }

  // Seed reviews + favorites on the most-reviewed active products.
  const topProducts = await prisma.product.findMany({
    where: { active: true },
    orderBy: { reviewCount: "desc" },
    take: 6,
  });
  const sampleReviews = [
    { rating: 5, title: "Exactly as described", body: "Incredible quality and you can feel it's made by people who care. Proud to buy American." },
    { rating: 5, title: "Worth every penny", body: "Shipped fast, packaged with care, and the craftsmanship is top notch. Will buy again." },
    { rating: 4, title: "Really happy", body: "Solid build and great value. Knocked off one star only because I wish it came in more options." },
    { rating: 5, title: "Supporting U.S. makers", body: "Love that this keeps Americans working. The product itself is fantastic too." },
  ];
  let reviewCount = 0;
  for (const prod of topProducts) {
    for (let i = 0; i < 3; i++) {
      const r = sampleReviews[(reviewCount + i) % sampleReviews.length];
      const author = reviewers[(reviewCount + i) % reviewers.length];
      await prisma.review.create({
        data: { rating: r.rating, title: r.title, body: r.body, authorName: author.name, userId: author.id, productId: prod.id, verified: true },
      });
      reviewCount++;
    }
  }

  // The demo buyer has liked the top 3 products.
  for (const prod of topProducts.slice(0, 3)) {
    await prisma.favorite.create({ data: { userId: buyer.id, productId: prod.id } });
  }
  // Feature the top products in various spots (admin can change this).
  for (let i = 0; i < Math.min(3, topProducts.length); i++) {
    await prisma.product.update({
      where: { id: topProducts[i].id },
      data: { featuredHome: true, featuredNewsletter: i < 2, featuredCategory: i < 2 },
    });
  }
  console.log(`Created ${reviewCount} reviews and 3 favorites; featured products set.`);

  // Seed product views across the last 7 days so the seller daily overview has data.
  const activeProducts = await prisma.product.findMany({ where: { active: true }, select: { id: true, storeId: true } });
  const viewRows: { productId: string; storeId: string; createdAt: Date }[] = [];
  for (const prod of activeProducts) {
    for (let d = 0; d < 7; d++) {
      // deterministic-ish count per product per day
      const count = 3 + ((prod.id.charCodeAt(0) + d * 7) % 12);
      for (let n = 0; n < count; n++) {
        const when = new Date();
        when.setDate(when.getDate() - d);
        when.setHours(8 + (n % 12), (n * 7) % 60, 0, 0);
        viewRows.push({ productId: prod.id, storeId: prod.storeId, createdAt: when });
      }
    }
  }
  await prisma.productView.createMany({ data: viewRows });
  console.log(`Created ${viewRows.length} product views (last 7 days).`);

  // Demo chat thread: buyer ↔ a seller ↔ platform support
  const demoStore = await prisma.store.findFirst({ where: { name: "Summit Steel Goods" }, include: { owner: true } });
  if (demoStore) {
    const convo = await prisma.conversation.create({
      data: {
        buyerId: buyer.id, storeId: demoStore.id, subject: "Question about the water bottle",
        messages: {
          create: [
            { senderId: buyer.id, senderRole: "BUYER", senderName: buyer.name, body: "Hi! Is the 32oz bottle dishwasher safe, and does it keep drinks cold overnight?" },
            { senderId: demoStore.ownerId, senderRole: "SELLER", senderName: demoStore.name, body: "Great question! Hand-wash recommended to protect the powder coat, and yes — it holds cold ~24 hours. Made right here in Denver." },
            { senderId: admin.id, senderRole: "ADMIN", senderName: "Homefront Support", body: "Hi both — Homefront Support here if you need anything with the order. Thanks for buying American! 🇺🇸" },
          ],
        },
      },
    });
    console.log(`Created demo conversation (${convo.id}).`);
  }

  // Newsletter stories
  const POSTS = [
    {
      title: "Are American-Made Jeans Worth It? The Levi's Question",
      excerpt: "Levi's invented the blue jean in San Francisco in 1873 — but where are they made now? We dig into American denim and the makers still sewing at home.",
      coverEmoji: "👖",
      category: "Made in USA",
      author: "The Homefront Desk",
      body: "Levi Strauss & Co. invented the blue jean in San Francisco in 1873. For generations, \"Levi's\" and \"Made in USA\" meant the same thing. Today, the vast majority of Levi's are sewn overseas — like almost every mass-market jean on the shelf.\n\nBut American denim never died. A handful of mills and sewing shops still make jeans start-to-finish on U.S. soil — milling the denim, cutting it, and stitching it with chain-stitch machines that are older than most of us. Levi's even keeps a small \"Made in the USA\" line using cone-mill-style selvedge denim, a nod to where it all began.\n\nSo are American-made jeans worth it? A pair sewn here costs more — there's no way around paying a U.S. worker a U.S. wage. But they're built to be worn for a decade, repaired, and handed down. That's the trade: fewer, better, made by your neighbors.\n\nThat's exactly what Homefront Markets is for. The denim on this marketplace is milled and sewn in the Carolinas — and every pair keeps an American sewing line running.",
    },
    {
      title: "Forged in Tennessee: Inside Heartland Forge Co.",
      excerpt: "How a third-generation foundry in South Pittsburg still pours cast iron the old way — one skillet at a time.",
      coverEmoji: "🍳",
      category: "Maker Stories",
      author: "The Homefront Desk",
      body: "In the hills of South Pittsburg, Tennessee, the furnaces at Heartland Forge Co. have been burning for the better part of a century.\n\nWhile most cookware today is stamped out overseas, every skillet here is sand-cast from American iron, hand-finished, and seasoned before it ever leaves the floor. \"A good pan should outlive the person who buys it,\" says the foundry's lead caster.\n\nThat philosophy — build it once, build it right — is exactly why we started Homefront Markets. When you buy a Heartland skillet, you're not just buying cookware. You're keeping a furnace lit and a town working.",
    },
    {
      title: "Why 'Made in USA' Actually Matters",
      excerpt: "Every dollar spent on American-made goods ripples through a U.S. town. Here's the math — and the heart — behind it.",
      coverEmoji: "🇺🇸",
      category: "The Home Front",
      author: "Homefront Markets",
      body: "It's easy to treat \"Made in USA\" as a sticker. We treat it as a promise.\n\nWhen a product is made here, the wages, the materials, and the craftsmanship all stay in American communities. A single order can help cover a worker's shift, a farmer's harvest, or a family shop's rent.\n\nThat's the whole idea behind the home front: the everyday choice to back the people who make things here. Every maker on this marketplace certifies the U.S. origin of what they sell — so you can shop knowing exactly where your money lands.",
    },
    {
      title: "From Tree to Table: Vermont Maple Done Right",
      excerpt: "Timber Lane taps the same sugarbush their grandparents did. We followed a season from frozen sap to finished syrup.",
      coverEmoji: "🥞",
      category: "Maker Stories",
      author: "The Homefront Desk",
      body: "Maple season in Vermont is short, cold, and unforgiving. When the days warm and the nights still freeze, the sap runs — and the team at Timber Lane Woodworks barely sleeps.\n\nIt takes roughly 40 gallons of sap to make a single gallon of syrup, boiled down over a wood fire in the sugarhouse. No additives, no shortcuts, single-origin from one stand of trees.\n\nThe result is the amber syrup you'll find on the marketplace — and a reminder that the best American food is still made by hand, in small batches, by people who care.",
    },
  ];
  for (const p of POSTS) {
    await prisma.post.create({ data: { ...p, slug: slugify(p.title) } });
  }
  console.log(`Created ${POSTS.length} newsletter stories.`);

  // ---- CMS pages (editable in Admin → Design) ----
  // The home page, reproduced as widgets so it's fully editable but looks the same.
  const home = await prisma.page.create({
    data: { key: "home", title: "Home", system: true, published: true, showInNav: false },
  });
  const homeSections: { type: string; config: any }[] = [
    { type: "hero", config: {} },
    { type: "newsletterFeature", config: {} },
    { type: "featuredProducts", config: { heading: "⭐ Featured", source: "featured_home", count: 4, landingOnly: true } },
    { type: "recommended", config: {} },
    { type: "recentlyViewed", config: {} },
    { type: "featuredProducts", config: { heading: "❤️ Most Liked", source: "most_liked", count: 4, seeAllText: "See all", seeAllHref: "/?sort=most_liked", landingOnly: true } },
    { type: "storyStrip", config: {} },
    { type: "categoryChips", config: { heading: "Shop by category" } },
    { type: "shopGrid", config: { heading: "Featured American-made products", showFilters: true } },
    { type: "trustBadges", config: {} },
  ];
  for (let i = 0; i < homeSections.length; i++) {
    await prisma.section.create({ data: { pageId: home.id, type: homeSections[i].type, order: i, config: JSON.stringify(homeSections[i].config) } });
  }

  // A sample custom page to show how new pages + menu links work.
  const promise = await prisma.page.create({
    data: { key: "our-promise", title: "Our Promise", system: false, published: true, showInNav: true, navLabel: "Our Promise", navOrder: 1, metaDescription: "Our promise to American makers and shoppers." },
  });
  const promiseSections: { type: string; config: any }[] = [
    { type: "hero", config: { headline: "Our Promise to America", subtext: "Every product on Homefront Markets is made by American hands. That's not a marketing filter — it's the whole store.", ctaText: "Start shopping", ctaHref: "/", secondaryText: "Become a seller", secondaryHref: "/sell", showBadges: true } },
    { type: "imageText", config: { heading: "Verified, not assumed", body: "Sellers certify the U.S. origin of everything they list before it goes live.\nNo imports hiding behind a flag — just real American makers.", imageSide: "right", ctaText: "Meet the makers", ctaHref: "/vendors" } },
    { type: "richText", config: { heading: "Where your dollars go", body: "When you buy here, your money goes to U.S. wages, materials, and craftsmanship.\nA single order can cover a worker's shift. That's the home front.", align: "center" } },
    { type: "newsletterSignup", config: { heading: "📬 Get American-made picks in your inbox", buttonLabel: "Subscribe" } },
  ];
  for (let i = 0; i < promiseSections.length; i++) {
    await prisma.section.create({ data: { pageId: promise.id, type: promiseSections[i].type, order: i, config: JSON.stringify(promiseSections[i].config) } });
  }

  // Dedicated newsletter landing page — clean, centered "Join the newsletter".
  const join = await prisma.page.create({
    data: { key: "join", title: "Join the Newsletter", system: false, published: true, showInNav: true, navLabel: "📬 Join", navOrder: 0, metaDescription: "Join the Homefront Markets newsletter for maker stories and new American-made drops." },
  });
  await prisma.section.create({ data: { pageId: join.id, type: "newsletterHero", order: 0, config: JSON.stringify({}) } });

  // Dedicated SMS opt-in landing page — clean "Get text deals".
  const textDeals = await prisma.page.create({
    data: { key: "text-deals", title: "Text Deals", system: false, published: true, showInNav: true, navLabel: "📱 Text Deals", navOrder: 1, metaDescription: "Get exclusive Homefront Markets deals by text." },
  });
  await prisma.section.create({ data: { pageId: textDeals.id, type: "smsOptIn", order: 0, config: JSON.stringify({}) } });

  // The shared product-page template — widgets shown on EVERY product page.
  const productTemplate = await prisma.page.create({
    data: { key: "product-template", title: "Product page", system: true, published: true, showInNav: false },
  });
  const productSections: { type: string; config: any }[] = [
    { type: "relatedProducts", config: { heading: "You might also like", count: 4 } },
    { type: "newsletterSignup", config: { heading: "📬 Get more American-made picks in your inbox", buttonLabel: "Subscribe" } },
  ];
  for (let i = 0; i < productSections.length; i++) {
    await prisma.section.create({ data: { pageId: productTemplate.id, type: productSections[i].type, order: i, config: JSON.stringify(productSections[i].config) } });
  }
  // About page — reproduced as editable widgets.
  const about = await prisma.page.create({ data: { key: "about", title: "About", system: true, published: true, showInNav: false } });
  const aboutSections: { type: string; config: any }[] = [
    { type: "pageHeader", config: { heading: "Keep America Working.", subtext: "Homefront Markets exists for one reason: to make it easy to buy high-quality American-made goods and keep U.S. workers, farms, and family shops thriving. Every product here is made by American hands — and every order you place sends your dollars back into American communities." } },
    { type: "featureCards", config: { cards: [
      "🔎 | Verified Made in USA | Every seller certifies the U.S. origin of what they sell before it ever goes live. No imports hiding behind a flag.",
      "🏭 | Direct from makers | You buy straight from American factories, workshops, and family farms — no faceless middlemen.",
      "🤝 | Money stays home | Wages, materials, and craftsmanship all stay in U.S. towns. A single order can cover a worker's shift.",
      "🇺🇸 | Built for the home front | We're a marketplace with a mission — to keep America making things, and to make those things easy to find.",
    ].join("\n") } },
    { type: "imageText", config: { heading: "Our story", body: "We started Homefront Markets because finding genuinely American-made goods online is harder than it should be. Big marketplaces bury U.S. makers under a flood of cheap imports. We flipped that: here, American-made isn't a filter you have to dig for — it's the whole store.\nEvery maker on this marketplace is a real American business with real employees. When you shop here, you're not just buying a product — you're casting a vote for American work.", imageSide: "right", ctaText: "Start shopping", ctaHref: "/" } },
  ];
  for (let i = 0; i < aboutSections.length; i++) {
    await prisma.section.create({ data: { pageId: about.id, type: aboutSections[i].type, order: i, config: JSON.stringify(aboutSections[i].config) } });
  }

  // Vendors page — header + the live maker directory.
  const vendors = await prisma.page.create({ data: { key: "vendors", title: "Vendors", system: true, published: true, showInNav: false } });
  const vendorSections: { type: string; config: any }[] = [
    { type: "pageHeader", config: { heading: "Meet the Makers", subtext: "The American businesses behind every product on Homefront Markets. Family shops, foundries, farms, and factories — all keeping America working." } },
    { type: "vendorsList", config: {} },
  ];
  for (let i = 0; i < vendorSections.length; i++) {
    await prisma.section.create({ data: { pageId: vendors.id, type: vendorSections[i].type, order: i, config: JSON.stringify(vendorSections[i].config) } });
  }
  console.log("Created CMS pages: home (9 widgets) + About + Vendors + Our Promise (custom) + Product page template.");

  // Demo Q&A + a sample seller-run coupon.
  const someProducts = await prisma.product.findMany({ where: { active: true, store: { approved: true } }, take: 3, include: { store: true } });
  if (someProducts[0]) {
    await prisma.question.create({ data: { productId: someProducts[0].id, authorName: "Jordan P.", body: "Is this dishwasher safe?", answer: "Yes — top-rack is best to keep the finish looking great for years.", answeredBy: someProducts[0].store.name, answeredAt: new Date() } });
    await prisma.question.create({ data: { productId: someProducts[0].id, authorName: "Casey M.", body: "Does it ship to Alaska and Hawaii?" } });
  }
  if (someProducts[1]) {
    await prisma.question.create({ data: { productId: someProducts[1].id, authorName: "Sam R.", body: "Any tips on sizing for a slimmer fit?" } });
  }
  const firstStore = someProducts[0]?.store;
  if (firstStore) {
    await prisma.coupon.create({ data: { code: "MAKER15", type: "PERCENT", value: 15, storeId: firstStore.id, active: true } });
    console.log(`Created demo Q&A + seller coupon MAKER15 (scoped to ${firstStore.name}).`);
  }

  const productCount = await prisma.product.count();
  console.log(`\nDone! Seeded ${SELLERS.length} stores and ${productCount} products.`);
  console.log("Buyer login:  buyer@demo.com / password123");
  console.log("Seller login: seller1@demo.com / password123  (and seller2..seller11)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
