# Veasna Shop API

E-commerce backend for the Veasna Shop storefront. Node.js + Express + PostgreSQL (Docker) + Stripe (Payment Element).

## Stack

- **Runtime:** Node.js 20 (Express 5)
- **Database:** PostgreSQL 16 via Docker Compose (host port **5433**)
- **Payments:** Stripe Payment Element (test mode)
- **Auth:** JWT (Bearer tokens), bcrypt password hashing

## Prerequisites

Install if you do not have them:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org) 18+ and npm (needed only for the test runner)
- Stripe CLI — optional, only for real webhook testing: `stripe --version`

## 1. Install dependencies

The API itself runs inside Docker, but the automated tests are run from your
host with jest/supertest, so install them once:

```bash
npm install
```

## 2. Configure `.env`

Copy and adjust:

```bash
cp .env.example .env
```

Current `.env` layout (real Stripe test keys are already set):

```
PORT=5050
DATABASE_URL=postgresql://veasna:veasna_password@localhost:5433/veasna_shop
JWT_SECRET=change_me_in_production
STRIPE_PUBLISHABLE_KEY=pk_test_...   # frontend <StripeProvider>/loadStripe()
STRIPE_SECRET_KEY=sk_test_...        # backend server-side
STRIPE_WEBHOOK_SECRET=whsec_...      # needed only for Stripe webhooks
CLIENT_URL=http://localhost:3000
```

> Note: Windows reserves port 5000 on some machines, so the API defaults to **5050**.

## 3. Run the whole stack (Docker)

This builds and starts both services — Postgres and the API:

```bash
docker compose up -d --build
```

- API at **http://localhost:5050**
- Postgres on host port **5433**

On first boot the DB auto-runs `db/init.sql` (creates all tables) and
`db/seed.sql` (demo data). To rebuild the DB from scratch:

```bash
docker compose down -v && docker compose up -d --build
```

Smoke-check it:

```bash
curl http://localhost:5050/api/health
# {"status":"ok"}
```

### Seeded demo data

- Admin login: `admin@veasnashop.com` / `admin123`
- Customer login: `customer@veasnashop.com` / `customer123`
- 4 parent categories (11 total), 12 products, 27 variants

### Connection details (dev only)

| Key      | Value                  |
|----------|------------------------|
| Host     | `localhost`            |
| Port     | `5433`                 |
| User     | `veasna`               |
| Password | `veasna_password`      |
| Database | `veasna_shop`          |

## 4. Run the tests

The tests hit the local Docker Postgres directly (host port 5433), so keep the
stack up from section 3.

```bash
npm run test:integration   # jest + supertest — 50 tests, 6 suites
npm test                   # full-flow smoke test (Stripe mocked) — 23 checks
```

Suites: `auth`, `products`, `categories`, `account`, `checkout`, `admin`.

## 5. Manual checkout test (real Stripe)

1. Confirm the test keys in `.env`, then recreate the API container so it picks
   up any `.env` change (`.env` is read at container creation):

   ```bash
   docker compose up -d api
   ```

2. Payment flow (Payment Element):

   - `POST /api/checkout/payment-intent` → `{ "clientSecret": "pi_..._secret_..." }`
     (send an auth token + `amount` in cents)
   - Frontend mounts the Payment Element with that `clientSecret`
   - `POST /api/checkout` with `paymentIntentId` + `lineItems` + `totals` → order created (`VSN-xxxxxx`), transaction recorded, stock decremented

3. Test card — `4242 4242 4242 4242`, any future expiry, any CVC/ZIP.
   Use `4000 0000 0000 0002` to test a declined payment.

To enable Stripe webhooks (optional), run the CLI and paste the printed
`whsec_...` into `.env`:

```bash
stripe listen --forward-to localhost:5050/api/stripe/webhook
```

Verify a completed checkout:

```bash
docker exec veasna_shop_db psql -U veasna -d veasna_shop -c \
  "SELECT id, order_id, status FROM stripe_transactions ORDER BY id DESC LIMIT 3;"

docker exec veasna_shop_db psql -U veasna -d veasna_shop -c \
  "SELECT id, order_number, total_amount, fulfillment_status FROM orders ORDER BY id DESC LIMIT 3;"
```

## API endpoints

| Area       | Routes |
|------------|--------|
| Auth       | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/forgot-password`, `GET /api/auth/me` |
| Catalog    | `GET /api/products`, `GET /api/products/:id`, `GET /api/products/:id/pairing`, `GET /api/categories` |
| Checkout   | `POST /api/checkout/payment-intent`, `POST /api/checkout`, `POST /api/stripe/webhook` |
| Orders     | `GET /api/orders`, `GET /api/orders/:id` |
| Account    | `GET /api/me/dashboard`, wishlist, addresses, rituals, settings (see contract) |
| Admin      | `GET /api/admin/dashboard`, `/api/admin/products`, `/api/admin/orders`, `/api/admin/categories`, + CRUD |
| Newsletter | `POST /api/newsletter/subscribe` |

Full request/response shapes: [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md).

## Project layout

```
config/db.js            pg Pool (reads DATABASE_URL)
controllers/            auth, products, categories, checkout/stripe, orders, user, admin, newsletter
middlewares/            JWT auth, admin guard, error handler
routes/                 HTTP route wiring
db/init.sql             schema (auto-runs in Docker)
db/seed.sql             demo data (auto-runs in Docker)
test/                   smoke test + jest integration suites
docs/API_CONTRACT.md    endpoint contract used by the frontend
```

## Troubleshooting

- **Port 5050 busy** → change `PORT` in `.env`, then `docker compose up -d api`.
- **DB not seeding** → wipe and recreate: `docker compose down -v && docker compose up -d --build`.
- **`{"error":"Invalid API Key"}`** → you changed Stripe keys in `.env` but the container still runs the old ones; recreate it: `docker compose up -d api`.
- **Webhook not reaching the API** → confirm `whsec_...` in `.env` matches the value printed by `stripe listen`, and that the API was recreated after the change.