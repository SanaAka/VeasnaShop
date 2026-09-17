# Veasna Shop — Frontend ⇄ Backend API Contract

This document specifies every API the Veasna Shop frontend consumes. It is the source of truth for the backend developer. The frontend is currently static (all data lives in `client/src/data/mockData.js` and page-local constants); this file describes what the backend must replace them with.

## Conventions

- Base URL: `/api` (configurable via an environment variable, e.g. `VITE_API_URL`).
- Format: JSON. All responses are plain objects/arrays — no envelope unless noted.
- Money: always sent as **numbers** (`price: 145.0`). The frontend formats currency itself (`$145.00`). Do NOT pre-format money strings in the API.
- Status strings are typed exactly as the frontend matches on them (see each section).
- Auth: `Authorization: Bearer <token>` for customer endpoints; `/admin/*` requires an admin token.
- IDs: `products.id` is a number. Order IDs are human-readable strings like `"VSN-10249"`. Payment intents are Stripe `pi_...` strings.
- Pagination: not yet required by the UI; return all records for now.
- Error format (all endpoints):
  ```json
  { "error": "human readable message" }
  ```
  HTTP status codes: 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 422 duplicate/invalid state, 500 server.

---

## 1. Auth

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Sign in |
| POST | `/auth/forgot-password` | Request password reset email |
| GET | `/auth/me` | Current user profile (used to prefill account pages) |

### POST /auth/register
Request:
```json
{
  "name": "Sora V.",
  "email": "sora@veasna.com",
  "password": "sekrit"
}
```
Response `201`:
```json
{ "token": "...", "user": { "id": 1, "name": "Sora V.", "email": "sora@veasna.com" } }
```

### POST /auth/login
Request:
```json
{ "email": "sora@veasna.com", "password": "sekrit" }
```
Response `200`:
```json
{ "token": "...", "user": { "id": 1, "name": "Sora V.", "email": "sora@veasna.com" } }
```

### POST /auth/forgot-password
Request:
```json
{ "email": "eleanor@sanctuary.com" }
```
Response `200`:
```json
{ "sent": true }
```
The UI shows a "sent" state with a 45-second resend lockout. Resend = same endpoint again.

---

## 2. Products (catalog)

### GET /products
Query params (all optional):
- `category` — category slug (e.g. `ceramics-table`). Catalog page filters via `?category=slug`.
- `search` — search string; frontend matches against **name, category, and tag** only.
- `sort` — `featured` | `price-asc` | `price-desc` | `rating`.
- `maxPrice` — numeric price cap.

Response `200`:
```json
{
  "products": [
    {
      "id": 1,
      "name": "Kyoto Stone Pitcher",
      "category": "Ceramics",
      "price": 74.0,
      "rating": 4.9,
      "reviews": 64,
      "tag": "Artisan Made",
      "image": "https://...",
      "categorySlug": "ceramics-table",
      "color": "#4A705E",
      "originalPrice": 180.0
    }
  ]
}
```
Notes:
- `tag` may be `null`.
- `originalPrice` is optional (only present on items with a sale/compare-at price, e.g. product id 8).
- `rating` can exceed 1 decimal; `reviews` is an integer.
- `color` is a hex string used for swatch chips. Frontend types: `"Ceramics"`, `"Linen Care"`, `"Botanicals"`, `"Apothecary"`, `"Stoneware Clay"`, `"Slow Fashion"`, `"Apparel & Linen"`.

### GET /products/:id
Response `200`:
```json
{
  "product": {
    "id": 5,
    "name": "Komorebi Stoneware Teapot",
    "category": "Stoneware Clay",
    "price": 84.0,
    "rating": 4.9,
    "reviews": 64,
    "tag": "Bestseller",
    "image": "https://...",
    "categorySlug": "ceramics-table",
    "color": "#4A705E",
    "variantOptions": {
      "color": ["Sage Moss", "Stone", "Clay"],
      "scent": ["Hinoki", "Cedar & Vetiver", "Smoked Moss"]
    }
  }
}
```
Notes:
- `variantOptions` drives the size/color/scent selector chips on the detail page.
- If `:id` is not found, the current static UI falls back to showing product id 1 — the backend should instead return `404`.

### GET /products/:id/pairing (recommendations)
Response `200`:
```json
{
  "items": [
    {
      "name": "Hinoki & Smoked Moss Candle",
      "category": "Botanical Scent",
      "price": 38.0,
      "detail": "Burn time: 55 hrs",
      "status": "In Stock",
      "image": "https://..."
    }
  ]
}
```
Used by the "Complete the ritual" rail on the product detail page. Even if the product has no pairings, return `{ "items": [] }`.

---

## 3. Categories

### GET /categories
Response `200`:
```json
{
  "categories": [
    {
      "name": "Artisanal Ceramics",
      "slug": "ceramics-table",
      "description": "Muted clay, tactile stoneware & mineral glazes",
      "count": 24,
      "image": "https://..."
    }
  ]
}
```
Notes:
- `slug` is used for URL filters (`/products?category=<slug>`), home category cards, and the storefront nav.
- Known slugs: `ceramics-table`, `apparel-linen`, `scents-botanicals`, `textiles-linen`.

---

## 4. Cart

The cart page and checkout both render line items. A line item matches the cart shape exactly:

```json
{
  "id": 8,
  "name": "Pure Washed Organic Linen Robe",
  "category": "Linen & Loungewear",
  "price": 145.0,
  "qty": 1,
  "variant": "Sage Moss",
  "size": "M / L",
  "sku": "VSN-ROB-SGM-01",
  "tag": "Eco-Wash",
  "status": "In Stock",
  "giftWrap": false,
  "image": "https://..."
}
```

### Pricing rules the frontend uses (must be mirrored server-side)
- `subtotal` = Σ (price × qty)
- `wrapFee` = 5.0 per line item where `giftWrap === true`
- `shipping` = 12.0 flat (Eco-Standard, Carbon Neutral)
- `tax` = 22.6 (static in demo; backend should compute real tax)
- `total` = subtotal + wrapFee + shipping + tax
- Promo code `BOTANICAL15` → 15% discount off subtotal. Applied only when the entered promo uppercased equals the code exactly.

### Optional endpoints (recommended for later)
| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/cart` | Load cart (server-side cart for logged-in users) |
| POST | `/cart/items` | Add line item |
| PATCH | `/cart/items/:id` | Update qty (1–10) |
| DELETE | `/cart/items/:id` | Remove line item |
| POST | `/cart/promo` | Validate promo → `{ "code": "BOTANICAL15", "discount": 0.15 }` |
| GET | `/cart/totals` | Return `{ subtotal, wrapFee, shipping, tax, discount, total, itemCount }` |

---

## 5. Checkout + Payment (Stripe)

Currently the Stripe Payment Element and Apple Pay buttons are **visual placeholders** — no real payment call is made. When wiring up, use this contract.

### POST /checkout/payment-intent (Stripe)
Request:
```json
{
  "amount": 38460,
  "currency": "usd",
  "customer": { "name": "...", "email": "...", "phone": "..." },
  "lineItems": [
    { "name": "Pure Washed Organic Linen Robe", "qty": 1, "price": 14500 }
  ],
  "shipping": { "line1": "...", "line2": "...", "city": "...", "state": "...", "zip": "...", "country": "US" },
  "saveInfo": true
}
```
Amounts in **cents** for Stripe.
Response `200`:
```json
{ "clientSecret": "pi_..._secret_..." }
```

### POST /checkout (create order after successful payment)
Request:
```json
{
  "paymentIntentId": "pi_3Nx9a2Kp...",
  "billing": { "name": "...", "email": "...", "phone": "..." },
  "shipping": { "line1": "...", "line2": "...", "city": "...", "state": "...", "zip": "...", "country": "US" },
  "lineItems": [ "see cart section" ],
  "totals": { "subtotal": 345.0, "wrapFee": 5.0, "shipping": 12.0, "tax": 22.6, "discount": 0.0, "total": 384.6 },
  "promoCode": "BOTANICAL15"
}
```
Response `201`:
```json
{
  "order": {
    "id": "VSN-10249",
    "status": "Paid",
    "date": "Sep 16, 2026",
    "estimatedDelivery": "Sep 19–21, 2026",
    "payment": "Stripe •••• 4242",
    "shippingMethod": "Eco-Standard — Carbon Neutral",
    "total": 384.6,
    "items": 4
  }
}
```
- On success the frontend routes to `/checkout/success` (renders Order Number = `order.id`, `estimatedDelivery`, `payment`, `shippingMethod`).
- On cancel/decline the frontend routes to `/checkout/cancel` (no API call needed).

---

## 6. Orders (customer "My Orders")

### GET /orders (authenticated customer)
Response `200`:
```json
{
  "orders": [
    {
      "id": "VSN-10248",
      "customer": "Elena M.",
      "email": "elena@example.com",
      "date": "Sep 14, 2026",
      "total": 384.6,
      "status": "Fulfilled",
      "payment": "Stripe • •••• 4242",
      "items": 3
    }
  ]
}
```
Used by `UserDashboard` "My Orders" tab. Critical: `status` must be one of exactly these strings (the UI maps predefined Tailwind classes to them):
- `Fulfilled`
- `Processing`
- `Paid`
- `Cancelled`

### GET /orders/:id (single order detail)
Response `200`:
```json
{
  "order": {
    "id": "VSN-10248",
    "status": "Fulfilled",
    "date": "Sep 14, 2026",
    "payment": "Stripe • •••• 4242",
    "tracking": { "carrier": "DHL Eco", "number": "#94821" },
    "items": [ "line item shape from cart section" ],
    "totals": { "subtotal": 345.0, "wrapFee": 5.0, "shipping": 12.0, "tax": 22.6, "total": 384.6 },
    "addresses": { "billing": { "...": "" }, "shipping": { "...": "" } }
  }
}
```

---

## 7. User Dashboard (account)

Sections: Overview, My Orders, Wishlist, Addresses, Ritual Profile, Settings.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/me/dashboard` | Overview stats + recent orders + peek of other sections |
| GET | `/me/orders` | Alias of `/orders` |
| GET | `/me/wishlist` | List of saved items (line item shape) |
| GET | `/me/addresses` | Saved addresses |
| GET | `/me/rituals` | Ritual/profile preferences |
| PATCH | `/me/settings` | Update profile settings |

`/me/wishlist` response:
```json
{
  "items": [ "line item shape from cart section" ]
}
```

`/me/dashboard` response:
```json
{
  "user": { "id": 1, "name": "Sora V.", "email": "sora@veasna.com" },
  "stats": [
    { "label": "Total Spend", "value": "$1,284.50", "icon": "payments", "note": "Across 8 mindful orders" },
    { "label": "Orders Placed", "value": "8", "icon": "receipt_long", "note": "4 in transit • 4 delivered" }
  ],
  "recentOrders": [ "order shape from section 6" ]
}
```

---

## 8. Admin Dashboard (analytics)

### GET /admin/dashboard?range=last-30-days
Query param `range` (dates range label shown in UI).
Response `200`:
```json
{
  "kpis": [
    { "label": "Gross Revenue", "value": "$48,920.50", "change": "+14.2%", "icon": "payments", "note": "Next payout $6,420 tmrw", "spark": "M0 35 Q 25 32, 45 22 T 90 18 T 130 8 T 160 4" },
    { "label": "Total Orders", "value": "418 Orders", "change": "+8.5%", "icon": "local_mall", "note": "382 fulfilled • 36 pending", "bar": true },
    { "label": "Average Order Value", "value": "$117.03", "change": "+3.1%", "icon": "analytics", "note": "Healthy basket size" },
    { "label": "Action Required", "value": "4 Low Stock", "change": null, "icon": "warning", "note": "Supplier SLA 99.2% on-time", "action": true }
  ],
  "chart": {
    "mode": "revenue",
    "series": [ { "points": [12, 24, 18, 36, 42, 51, 47], "peak": 3140.0 } ],
    "ordersSeries": [ { "points": [180, 205, 212, 190, 174, 201, 192], "peak": 212 } ]
  },
  "departments": [
    { "label": "Washed Organic Linen", "value": "$20,546", "pct": "(42%)", "color": "bg-primary-container" },
    { "label": "Artisanal Ceramics", "value": "$13,697", "pct": "(28%)", "color": "bg-secondary-fixed-dim" },
    { "label": "Scents & Botanicals", "value": "$8,805", "pct": "(18%)", "color": "bg-tertiary-container" },
    { "label": "Handwoven Textiles", "value": "$5,872", "pct": "(12%)", "color": "bg-secondary-fixed" }
  ],
  "orders": [ "operational order rows, see below" ],
  "lowStock": [
    { "img": "https://...", "name": "Pure Washed Linen Robe (XL/XXL)", "sku": "VSN-LNN-012 • Sage Moss", "left": "Only 1 left!", "urgent": true, "reorder": "Reorder point: 5" }
  ],
  "activity": [ { "icon": "spa", "title": "...", "detail": "...", "time": "12m ago" } ]
}
```
Notes:
- `value`, `change`, `pct` are preformatted display strings in the demo because each card formats differently. Prefer sending numbers and letting the frontend format; if sending strings, keep these exact patterns.
- `color` for departments are Tailwind class tokens. Suggest instead sending a semantic `categoryKey` (`linen`, `ceramics`, `scents`, `textiles`) and letting the frontend own the color mapping.

Operational order rows (fulfillment queue on dashboard):
```json
{
  "id": "#VSN-8492",
  "time": "Today, 14:22",
  "initials": "ER",
  "name": "Elena Rostova",
  "email": "elena.r@lifestyle.co",
  "item": "Pure Washed Linen Robe (M / Sage Moss)",
  "sub": "+ 1 Artisanal Cedar Bath Salt",
  "payment": "Paid (Stripe)",
  "total": "$145.00",
  "status": "unfulfilled",
  "shipped": false
}
```
`initials` is the avatar monogram (may be derived from `name`). `status` values: `unfulfilled` | `shipped`. `fulfilment` label is derived from status in the UI (In Queue → Packing → Shipped/Delivered).

---

## 9. Admin Products & Inventory

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET / PATCH | `/admin/products` | List / bulk update |
| POST | `/admin/products` | Create |
| GET / PUT / DELETE | `/admin/products/:id` | Read / update / delete |
| PATCH | `/admin/products/:id/variants/:sku` | Update a single variant |

`GET /admin/products` response `200`:
```json
{
  "products": [
    {
      "id": 1,
      "name": "Pure Washed Organic Linen Robe",
      "sku": "VSN-ROB-001",
      "category": "Textiles & Loungewear",
      "units": "22 units",
      "stockLevel": 22,
      "status": "Published",
      "price": 145.0,
      "provenance": "GOTS Organic",
      "colors": ["#4A705E", "#D6C7B2", "#343837"],
      "image": "https://...",
      "variants": [
        {
          "color": "#4A705E",
          "label": "Sage Moss • XS / S",
          "sku": "VSN-ROB-SGM-01",
          "price": 145.0,
          "stock": 14,
          "badge": "Active"
        }
      ]
    }
  ]
}
```
Notes:
- `status`: `Published` | `Draft`.
- `badge` derived from stock: `Active` (in stock), `Low Stock` (3–4 left), `Restock Queued` (≤1). Send numeric `stock`, let the UI derive badges.
- `provenance` is a human string ("GOTS Organic", "Wood-fired Kiln", "Steam-distilled", "Small-batch Kiln #4", "Handwoven").
- Row search filters on `name` and `sku` (case-insensitive).

---

## 10. Admin Orders — Fulfillment Queue

### GET /admin/orders?status=all
Query param `status`: `all` | `unfulfilled` | `shipped` (or filter client-side).

Response `200`:
```json
{
  "orders": [
    {
      "id": "#VSN-8492",
      "tag": { "icon": "redeem", "label": "Gift Box" },
      "time": "Today, 14:24 EST",
      "name": "Elena Rostova",
      "email": "elena.r@lifestyle.co",
      "loc": "US • Portland, OR",
      "items": 2,
      "images": [ "https://...", "https://..." ],
      "payment": "Paid",
      "pid": "pi_3Nx9a2Kp...",
      "fulfilment": "In Queue",
      "total": "$156.60",
      "highlight": true
    }
  ],
  "stats": [
    { "label": "Awaiting Fulfillment", "value": "12", "icon": "hourglass_top" },
    { "label": "Shipping Today", "value": "24", "icon": "local_shipping" },
    { "label": "In Packing Queue", "value": "4", "icon": "inventory_2" },
    { "label": "Returns Awaiting", "value": "2", "icon": "assignment_return" }
  ]
}
```
Notes:
- `tag` is optional (`null` when no packaging badge). Icons: `redeem` (Gift Box), `eco` (Furoshiki — eco packaging).
- `fulfilment` semantic states: `In Queue` → `Packing` → `Shipped` → `Delivered`. The UI colors these via the order's `shipped`/`highlight` flags.
- Search filters on `id`, `name`, `email` (case-insensitive).
- `pid` is the Stripe payment intent id.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| PATCH | `/admin/orders/:id/fulfil` | Advance state In Queue → Packing → Shipped |
| GET | `/admin/orders/:id` | Full order detail + items + address |

---

## 11. Admin Categories & Taxonomy

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/admin/categories` | Taxonomy tree |
| POST | `/admin/categories` | Create category |
| PUT / DELETE | `/admin/categories/:id` | Update / delete |

`GET /admin/categories` response `200`:
```json
{
  "categories": [
    {
      "id": "living",
      "name": "Living & Decor",
      "slug": "/living",
      "products": 18,
      "status": "Active",
      "image": "https://...",
      "children": [
        {
          "id": "ceramics",
          "name": "Artisanal Ceramics",
          "slug": "/products/ceramics",
          "items": 12,
          "description": "Tactile stoneware, hand-thrown pitchers...",
          "heroImage": "https://...",
          "featureMenu": true,
          "metaTitle": "Artisanal Hand-Thrown Ceramics & Tableware — Veasna",
          "metaDesc": "Discover tactile stoneware, hand-thrown pitchers..."
        },
        {
          "id": "kitchen",
          "name": "Studio Kitchen & Dining",
          "slug": "/products/kitchen-dining",
          "items": 6,
          "image": "https://...",
          "featureMenu": false
        }
      ]
    }
  ]
}
```
Notes:
- `status`: `Active`. Child `featureMenu` (`true`/`false`) toggles the "Featured Menu" editor.
- `heroImage`, `metaTitle`, `metaDesc`, `detail` fields are optional per child.
- Slug is used in navigation: `/living`, `/apparel`, `/apothecary`, `/products/<name>`.

---

## 12. Newsletter

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/newsletter/subscribe` | Email capture |

Request:
```json
{ "email": "user@example.com" }
```
Response `200`:
```json
{ "subscribed": true }
```
On success the footer swaps the form for the confirmation message ("You're in — seasonal letters land every full moon.").

---

## Frontend file references

- Storefront data source: `client/src/data/mockData.js`
- Catalog + search/sort: `client/src/pages/ProductCatalog.jsx`
- Product detail + pairings: `client/src/pages/ProductDetail.jsx`
- Cart + promo: `client/src/pages/Cart.jsx`
- Checkout + Stripe placeholder: `client/src/pages/Checkout.jsx`
- Account: `client/src/pages/UserDashboard.jsx`
- Admin analytics: `client/src/pages/AdminDashboard.jsx`
- Admin products/SKUs: `client/src/pages/AdminProducts.jsx`
- Admin fulfillment: `client/src/pages/AdminOrders.jsx`
- Admin taxonomy: `client/src/pages/AdminCategories.jsx`
- Auth: `client/src/pages/Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`