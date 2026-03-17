# Shopify Member Price App

A Shopify app that automatically applies **member pricing** to logged-in customers. When a customer creates an account or logs in, they see and receive discounted member prices at checkout.

---

## Features

- 🔐 **Automatic member discount** — applies a configurable percentage discount to all logged-in customers
- 🏷️ **Tag-based membership** — optionally restrict member pricing to customers with a specific Shopify customer tag (e.g. `member`, `vip`, `wholesale`)
- 💰 **Per-product member prices** — override the global discount with a fixed member price per product
- 🛒 **Checkout Discount Function** — member discounts are enforced at checkout via a Shopify Function, preventing price manipulation
- 🎨 **Theme App Extension** — displays a member price badge on product pages; non-logged-in visitors see a "Log in for member price" prompt
- ⚙️ **Admin dashboard** — manage global settings and per-product member prices from the Shopify admin

---

## How It Works

1. A store owner installs the app and configures the **discount percentage** (e.g. 10%) in **Settings**.
2. Optionally, the store owner sets a specific **customer tag** (e.g. `member`) that customers must have to qualify, or leaves "all logged-in customers" enabled.
3. The **Theme Extension block** is added to product pages via the Online Store Editor. It shows:
   - **Logged-in qualifying customers**: the discounted member price with savings amount.
   - **Guests / non-qualifying customers**: a "🔒 Log in for Member Price" prompt.
4. When a qualifying customer proceeds to checkout, the **Shopify Discount Function** automatically applies the correct discount — either a per-product fixed price or the global percentage.

---

## Tech Stack

| Layer | Technology |
|---|---|
| App framework | [Remix](https://remix.run/) + [@shopify/shopify-app-remix](https://github.com/Shopify/shopify-app-js) |
| UI | [Shopify Polaris](https://polaris.shopify.com/) |
| Database | [Prisma](https://www.prisma.io/) + SQLite (dev) / PostgreSQL (prod) |
| Checkout discounts | [Shopify Functions](https://shopify.dev/docs/apps/build/functions) (JavaScript) |
| Storefront display | [Theme App Extension](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions) (Liquid + JS) |

---

## Project Structure

```
shopify-member-price/
├── app/                          # Remix app (admin UI + backend)
│   ├── shopify.server.js         # Shopify auth & webhook setup
│   ├── db.server.js              # Prisma client
│   ├── root.jsx                  # Root Remix layout
│   └── routes/
│       ├── app._index.jsx        # Dashboard
│       ├── app.products.jsx      # Per-product member price management
│       ├── app.settings.jsx      # Global settings
│       └── webhooks.jsx          # Webhook handler
├── extensions/
│   ├── member-discount-function/ # Shopify Function (checkout discount)
│   │   └── src/index.js          # Discount logic
│   └── member-price-theme/       # Theme App Extension
│       ├── blocks/member-price.liquid   # Product page block
│       ├── snippets/member-price.liquid # Reusable snippet
│       └── assets/member-price.js      # Variant-change JS
├── prisma/
│   └── schema.prisma             # DB schema (Session, MemberPriceSettings)
├── shopify.app.toml              # Shopify app configuration
└── package.json
```

---

## Setup & Development

### Prerequisites

- Node.js 18+
- [Shopify CLI](https://shopify.dev/docs/tools/cli) (`npm install -g @shopify/cli`)
- [Javy](https://github.com/bytecodealliance/javy) — required to compile the Shopify Function to WebAssembly (install via the Shopify CLI or manually)
- A [Shopify Partner account](https://partners.shopify.com/)
- A development store

### 1. Clone & install

```bash
git clone https://github.com/Waripz/Shopify-App-member-price.git
cd Shopify-App-member-price
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your Shopify API credentials
```

### 3. Set up the database

```bash
npx prisma migrate dev --name init
```

### 4. Link to your Shopify app

```bash
shopify app config link
```

### 5. Run in development

```bash
shopify app dev
```

This will:
- Start the Remix development server
- Create an ngrok tunnel
- Register webhooks
- Deploy the Shopify Function and Theme Extension to your development store

---

## Configuration

### Global Settings (`/app/settings`)

| Setting | Description | Default |
|---|---|---|
| Discount Percentage | % off for all member purchases | 10% |
| All logged-in customers | Apply to anyone who is logged in | ✅ Enabled |
| Tag-based | Require a specific customer tag | ❌ Disabled |
| Member Tag | The tag to look for on customer accounts | `member` |

### Per-Product Prices (`/app/products`)

Override the global discount with a fixed member price for specific products. If a per-product price is set, it takes priority over the global percentage.

---

## Adding the Theme Block

1. In your Shopify admin, go to **Online Store → Themes → Customize**.
2. Navigate to a **Product page** template.
3. In the left sidebar, click **Add block** → search for **Member Price**.
4. Position the block near the product price.
5. Configure the block colours and whether to show the savings amount.
6. Click **Save**.

---

## Deployment

```bash
shopify app deploy
```

This deploys the Shopify Function and Theme Extension. The Remix app itself should be deployed to a platform like [Fly.io](https://fly.io/), [Railway](https://railway.app/), or [Vercel](https://vercel.com/).

---

## Running Tests

```bash
# Shopify Function unit tests
cd extensions/member-discount-function
npm install
npm test
```
