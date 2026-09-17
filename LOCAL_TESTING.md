# Local Testing Guide — Veasna Shop API

This guide covers local end-to-end testing against the Docker PostgreSQL database.

## Prerequisites

```bash
docker compose up -d db        # PostgreSQL on localhost:5433
```

The DB auto-creates tables (`db/init.sql`) and seeds demo data (`db/seed.sql`):

- Admin login: `admin@veasnashop.com` / `admin123`
- Customer login: `customer@veasnashop.com` / `customer123`

Seeded endpoint data: 4 parent categories (11 total), 12 products, 27 variants.

## Automated Tests

Both suites run against the local Docker Postgres and require it to be up first.

```bash
npm run test:integration   # jest + supertest: /api/auth, /api/products
npm test                   # full-flow smoke test with a mocked Stripe client
```

Concrete tests:
- `test/integration/auth.test.js` — register (201 / 409 duplicate / 400 missing fields), login (200 / 401 bad creds).
- `test/integration/products.test.js` — list products (contract `{products:[...]}` shape), product-by-id with variantOptions groups, pairing endpoint, 404 for unknown id.
- `test/smoke.js` — mocks Stripe via `mock-require` and verifies the checkout → webhook DB flow (order created, transaction succeeded, stock decremented).

## Running the API Locally

```bash
docker compose stop api      # optional: avoid port clash with the Docker API container
./start-dev.sh               # starts Express + Stripe CLI forwarding webhooks
```

`start-dev.sh` starts the Express server and concurrently runs:

```bash
stripe listen --forward-to localhost:5050/api/stripe/webhook
```

(`PORT` defaults to 5000 when `.env` does not set it. This repo's `.env` sets `PORT=5050`
because Windows reserves port 5000; adjust to your environment as needed.)

## Manual Stripe Checkout Test (real Stripe API)

Requires real test-mode keys in `.env`:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Get the webhook secret with:

```bash
stripe listen --forward-to localhost:5050/api/stripe/webhook
```

Then restart the API (`docker compose up -d --build api` or `./start-dev.sh`).

The checkout uses the Stripe **Payment Element** flow (`API_CONTRACT.md` §5):

1. Frontend calls `POST /api/checkout/payment-intent` (with a customer token and
   `amount` in cents) and receives `{ "clientSecret": "pi_..._secret_..." }`.
2. The Stripe Payment Element is mounted with that `clientSecret`.
3. The customer pays (see card below).
4. Frontend calls `POST /api/checkout` with the `paymentIntentId` + `lineItems` +
   `totals`. The API verifies the PaymentIntent is `succeeded`, creates the
   order (`VSN-...`), records a `succeeded` `stripe_transactions` row, and
   decrements stock. Returns the order summary.
5. Stripe also fires `payment_intent.succeeded` and `checkout.session.completed`
   webhook events to `/api/stripe/webhook` synchronously.

To drive steps 1–4 from the browser you need Stripe.js on the frontend. For a
pure API-level check, open the checkout page and complete it — then verify the
DB (below).

## Verifying a Completed Checkout

After a checkout completes, query the Docker Postgres to confirm the order was
persisted:

```bash
docker exec veasna_shop_db psql -U veasna -d veasna_shop -c \
  "SELECT id, order_id, stripe_payment_intent_id, amount, status
   FROM stripe_transactions ORDER BY id DESC LIMIT 3;"

docker exec veasna_shop_db psql -U veasna -d veasna_shop -c \
  "SELECT id, order_number, total_amount, fulfillment_status
   FROM orders ORDER BY id DESC LIMIT 3;"
```

Expected outcome after `POST /api/checkout` succeeds:

| Table                | Column                | Expected value            |
|----------------------|-----------------------|---------------------------|
| `orders`             | `order_number`        | `VSN-xxxxxx`              |
| `orders`             | `fulfillment_status`  | `Paid`                    |
| `stripe_transactions`| `status`              | `succeeded`               |
| `stripe_transactions`| `stripe_payment_intent_id` | `pi_...` (persisted) |
| `product_variants`   | `stock_quantity`      | decremented by quantity   |

If the order was never created, check the API logs in `docker compose logs api`
to see whether PaymentIntent verification failed (`status`, `amount`).