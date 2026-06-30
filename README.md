# Homefront Markets

The marketplace for **American-made products** — an Amazon-style storefront where every
listing is made in the USA. Full buyer, seller, and admin experiences with a complete
shopping, ordering, and fulfillment flow.

> **Note:** This repository holds the **source code** for the app, not the live website.
> To browse the actual store you run it locally (below) or visit the deployed site once it's
> hosted online. A code page on GitHub is the "blueprint," not the running store.

---

## What's built

**Storefront (buyers)**
- Browse / search / filter / categories, product detail pages with photos, reviews, Q&A
- Cart + checkout with live shipping quotes, coupons, store credit, and gift cards
- Accounts: order history + tracking, returns & cancellations, favorites, addresses
- Verified-purchase reviews, "frequently bought together," back-in-stock alerts, save-for-later
- Two-factor authentication (2FA), newsletter + SMS sign-ups

**Seller dashboard**
- Storefronts, product management (incl. CSV bulk import & per-size inventory)
- Orders to fulfill, shipping labels + tracking, packing slips, sales analytics
- Store-specific coupons, promotions, and a guided onboarding wizard

**Admin control center**
- Full **CMS page builder** — every page is editable with drag-and-drop widgets, custom
  backgrounds, theme colors & fonts, and an announcement bar
- Seller / product / user / category management, review moderation, returns & refunds
- Reports & CSV exports, audit log, platform analytics dashboard

**Integrations**
- **Cloudinary** — cloud image storage with responsive, auto-optimized photos *(live)*
- **Resend** — real transactional emails from `hello@homefrontmarkets.com` *(live)*
- **beehiiv** — newsletter sync *(configurable)*
- **EasyPost** — shipping labels *(simulation until a key is added)*
- **Stripe** — payments *(planned)*

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | **Next.js** (App Router, TypeScript) |
| Database | **Prisma** + SQLite locally (swap to Postgres for production) |
| Auth | bcrypt + signed JWT (http-only cookie) + optional TOTP 2FA |
| Styling | Custom CSS design system |

## Run it locally

Node lives in `%USERPROFILE%\nodejs` and is on your PATH.

```bash
npm install          # install dependencies
npm run db:reset     # create the database + load demo sellers/products
npm run dev          # start the server at http://localhost:3000
```

Then open <http://localhost:3000>.

## Demo logins

| Role | Email | Password |
|------|-------|----------|
| Buyer | `buyer@demo.com` | `password123` |
| Seller | `seller1@demo.com` … `seller11@demo.com` | `password123` |
| Admin | `admin@demo.com` | `password123` |

## Useful commands

```bash
npm run dev        # start dev server
npm run db:studio  # open a visual database browser
npm run db:reset   # wipe + reseed the database
```

## Roadmap

- [x] Backend: database, accounts, products, orders, seller fulfillment
- [x] Full storefront (browse, cart, checkout, accounts)
- [x] Seller dashboard + admin control center + CMS page builder
- [x] Cloud images (Cloudinary) and transactional email (Resend)
- [ ] Real payments (Stripe)
- [ ] Deploy online at **homefrontmarkets.com** (Postgres + hosting)
- [ ] Mobile app

---

*Configuration and secret keys live in a local `.env` file, which is intentionally kept out
of this repository.*
