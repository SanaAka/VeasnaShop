# Veasna Shop API — Local Setup Guide

Handoff doc for setting up and testing the API locally. Estimated time: 10 minutes.

## Prerequisites

Install these if you do not have them:

- Node.js 18+ (project uses `node:20` in Docker)
- Docker Desktop (for PostgreSQL)
- npm (comes with Node)
- Stripe CLI (optional, only for the real checkout test): `stripe --version`

---

## 1. Install dependencies

```bash
npm install
```

## 2. Start PostgreSQL (Docker)

The project ships a `docker-compose.yml` with a Postgres 16 service. On first
boot it auto-runs `db/init.sql` (creates all 7 tables) and `db/seed.sql`
(demo data). To rebuild the DB from scratch, use `docker compose down -v` first.

```bash
docker compose up -d db
```

Important: the DB is published on host port **5433** (the machine may already
have a Postgres on 5432).

### Connection details (dev only)

| Key      | Value                  |
|----------|------------------------|
| Host     | `localhost`            |
| Port     | `5433`                 |
| User     | `veasna`               |
| Password | `veasna_password`      |
| Database | `veasna_shop`          |

### Seeded demo data

- Admin login: `admin@veasnashop.com` / `admin123`
- Customer login: `customer@veasnashop.com` / `customer123`
- 3 categories, 6 products, 11 product variants

---

## 3. Configure `.env`

Copy the sample if one does not exist:

```bash
cp .env.example .env
```

For local REST/DB tests the defaults are fine. The Stripe values are
placeholders and only matter for the real Stripe test (see section 6). Add your
real test keys there when ready:

```
PORT=5050
DATABASE_URL=postgresql://veasna:veasna_password@localhost:5433/veasna_shop
JWT_SECRET=dev_secret_change_me_123456
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CLIENT_URL=http://localhost:3000
```

Note: port 5000 is reserved by Windows on some machines, so the default API
port is 5050.

---

## 4. Run the API

Option A — Docker (full stack):

```bash
docker compose up -d --build
# API at http://localhost:5050
```

Option B — local Node server against the Docker DB (faster iteration):

```bash
docker compose stop api        # avoid a port clash on 5050
npm run dev                    # nodemon
# API at http://localhost:5050
```

Smoke-check it:

```bash
curl http://localhost:5050/api/health
# {"status":"ok"}
```

---

## 5. Run the automated tests

Both suites hit the real Docker PostgreSQL. Start the DB first (section 2).

```bash
npm run test:integration   # jest + supertest: /api/auth, /api/products
npm test                   # full-flow smoke test (Stripe calls mocked)
```

- `test/integration/auth.test.js` — register/login (201, 409, 400, 401 cases).
- `test/integration/products.test.js` — product list + by-slug + 404.
- `test/smoke.js` — boots the API, mocks the Stripe client, and verifies the
  whole checkout → webhook flow: order created with server-calculated price,
  `stripe_transactions` marked `succeeded`, order set to `processing`, and
  product stock decremented.

Expected: `npm run test:integration` → 11 passed. `npm test` → 17 passed.

---

## 6. Manual Stripe checkout test (real Stripe)

The automated tests mock Stripe. To exercise the real Stripe API:

### 6a. Get your keys

1. Create a Stripe account (test mode) at https://dashboard.stripe.com.
2. Copy the test secret key (`sk_test_...`) from the Developers > API keys page.
3. Generate the webhook secret with the CLI:

```bash
stripe listen --forward-to localhost:5050/api/stripe/webhook
```

The CLI prints a `whsec_...` value. Put both into `.env` and restart the API:

```bash
docker compose up -d --build api
```

### 6b. Start a checkout

```bash
curl -X POST http://localhost:5050/api/stripe/checkout/create-session \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"variant_id":1,"quantity":1}]}'
```

Get a JWT first via:

```bash
curl -X POST http://localhost:5050/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@veasnashop.com","password":"customer123"}'
```

Open the returned `url` in a browser.

### 6c. Use the standard test card

On the Stripe Checkout page, pay with:

| Field        | Value                  |
|--------------|------------------------|
| Card number  | `4242 4242 4242 4242`  |
| Expiry       | any future date        |
| CVC          | any 3 digits           |
| ZIP          | any 5 digits           |

`4242 4242 4242 4242` always approves. To test a decline, use
`4000 0000 0000 0002`.

### 6d. Verify the webhook updated the database

After the payment completes, the `checkout.session.completed` event is
forwarded by the CLI, signature-verified, and processed by the webhook handler
(`controllers/stripeController.js`). Confirm the changes:

```bash
docker exec veasna_shop_db psql -U veasna -d veasna_shop -c \
  "SELECT id, order_id, stripe_session_id, amount, status
   FROM stripe_transactions ORDER BY id DESC LIMIT 3;"

docker exec veasna_shop_db psql -U veasna -d veasna_shop -c \
  "SELECT id, order_number, total_amount, fulfillment_status
   FROM orders ORDER BY id DESC LIMIT 3;"
```

Expected changes:

| Table                | Column                     | Before   | After       |
|----------------------|----------------------------|----------|-------------|
| `stripe_transactions`| `status`                   | `pending`| `succeeded` |
| `stripe_transactions`| `stripe_payment_intent_id` | `NULL`   | `pi_...`    |
| `orders`             | `fulfillment_status`       | `pending`| `processing`|
| `product_variants`   | `stock_quantity`           | original | decremented |

If the order stays `pending`, the webhook was not verified — check that
`STRIPE_WEBHOOK_SECRET` matches the `whsec_...` the `stripe listen` CLI prints,
and confirm the Stripe CLI log shows the event was forwarded.

---

## 7. Quick reference

| Command | Purpose |
|---------|---------|
| `docker compose up -d db` | start Postgres (auto-runs schema + seed) |
| `docker compose up -d --build api` | run full stack |
| `npm run dev` | local Node server on `.env` PORT |
| `npm run test:integration` | jest/supertest REST tests |
| `npm test` | full-flow smoke test (Stripe mocked) |
| `./start-dev.sh` | Express + `stripe listen` forwarding together |
| `npm run start` | production-style start |

Project layout:

```
config/db.js            pg Pool (reads DATABASE_URL)
controllers/            auth, products, stripe logic
middlewares/            JWT auth, admin guard, error handler
routes/                 HTTP route wiring
db/init.sql             schema (auto-runs in Docker)
db/seed.sql             demo data (auto-runs in Docker)
test/                   smoke + jest integration tests
```