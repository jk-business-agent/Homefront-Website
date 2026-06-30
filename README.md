# Home Front Markets

The marketplace for **American-made products**. An Amazon-style storefront where every
listing is made in the USA, with buyer accounts, seller shops, and an order/fulfillment flow.

This repo currently contains the **backend** (database + API). The storefront design is built next.

---

## Tech stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | **Next.js** (App Router, TypeScript) | Runs the API now and the website later |
| Database | **SQLite** via **Prisma** | A local file (`prisma/dev.db`). Swap to Postgres for production |
| Auth | bcrypt + signed JWT in an http-only cookie | Buyers and sellers |

## First-time setup

Node is installed in your user folder (`%USERPROFILE%\nodejs`) and on your PATH.

```bash
npm install          # install dependencies
npm run db:reset     # create the database + load demo sellers/products
npm run dev          # start the server at http://localhost:3000
```

## Demo logins

| Role | Email | Password |
|------|-------|----------|
| Buyer | `buyer@demo.com` | `password123` |
| Seller | `seller1@demo.com` … `seller11@demo.com` | `password123` |

## Useful commands

```bash
npm run dev        # start dev server
npm run db:studio  # open a visual database browser
npm run db:reset   # wipe + reseed the database
node scripts/smoke-test.mjs   # end-to-end API test (server must be running)
```

## How the order flow works

1. A buyer adds products to their cart and calls `POST /api/orders`.
2. The order is split into **order items**, each tagged with the seller's store.
3. Each seller sees only their items via `GET /api/seller/orders` — name, address, quantity.
4. The seller marks items shipped (`POST /api/seller/orders/[itemId]/ship`); when all of an
   order's items are shipped, the order status becomes `SHIPPED`.

## Roadmap

- [x] Backend: database, accounts, products, orders, seller fulfillment
- [ ] Storefront design (the real website UI)
- [ ] Buyer account pages (order history, addresses)
- [ ] Seller dashboard UI
- [ ] Real payments (Stripe)
- [ ] Deploy online (real web address)
- [ ] Mobile app (App Store)
