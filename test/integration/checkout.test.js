const RUN = Date.now();

const mockPICreate = jest.fn();
const mockPIRetrieve = jest.fn();
const mockPMRetrieve = jest.fn();
const mockConstruct = jest.fn();

jest.mock("stripe", () =>
  jest.fn(() => ({
    paymentIntents: {
      create: (...a) => mockPICreate(...a),
      retrieve: (...a) => mockPIRetrieve(...a),
    },
    paymentMethods: {
      retrieve: (...a) => mockPMRetrieve(...a),
    },
    webhooks: {
      constructEvent: (...a) => mockConstruct(...a),
    },
  }))
);

const request = require("supertest");
const app = require("../../app");
const pool = require("../../config/db");

afterAll(async () => {
  await pool.end();
});

const uniqueEmail = () =>
  `co_${Date.now()}_${Math.floor(Math.random() * 10000)}@test.com`;

let token;

beforeAll(async () => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Checkout Tester", email: uniqueEmail(), password: "secret123" });
  token = res.body.token;
});

describe("POST /api/checkout/payment-intent (mocked Stripe)", () => {
  test("creates a Payment Intent and returns clientSecret", async () => {
    mockPICreate.mockResolvedValue({
      client_secret: `pi_mock_${RUN}_test_secret_abc`,
    });

    const res = await request(app)
      .post("/api/checkout/payment-intent")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 38460, currency: "usd" });

    expect(res.status).toBe(200);
    expect(typeof res.body.clientSecret).toBe("string");
    expect(res.body.clientSecret).toContain(`pi_mock_${RUN}_test_secret_abc`);
    expect(mockPICreate).toHaveBeenCalledTimes(1);
  });

  test("rejects missing amount", async () => {
    const res = await request(app)
      .post("/api/checkout/payment-intent")
      .set("Authorization", `Bearer ${token}`)
      .send({ currency: "usd" });
    expect(res.status).toBe(400);
  });

  test("requires auth", async () => {
    const res = await request(app).post("/api/checkout/payment-intent").send({ amount: 100 });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/checkout (create order)", () => {
  test("creates an order when the PaymentIntent succeeded", async () => {
    const piId = `pi_mock_succ_${RUN}`;
    mockPIRetrieve.mockResolvedValue({
      id: piId,
      status: "succeeded",
      amount: 38460,
      payment_method: "pm_mock_1",
    });
    mockPMRetrieve.mockResolvedValue({ card: { last4: "4242", brand: "visa" } });

    const variant = (await pool.query("SELECT id FROM product_variants WHERE sku = 'PLR-M-L'")).rows[0];
    const before = (await pool.query("SELECT stock_quantity FROM product_variants WHERE id = $1", [variant.id])).rows[0].stock_quantity;

    const res = await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({
        paymentIntentId: piId,
        billing: { name: "Checkout Tester", email: exchangeEmail() },
        shipping: { line1: "1 Test Way", city: "Portland", state: "OR", zip: "97201", country: "US" },
        lineItems: [
          { variantId: variant.id, productId: 4, name: "Pure Washed Organic Linen Robe", qty: 1, price: 14500, sku: "PLR-M-L", variant: "M / L" },
        ],
        totals: { subtotal: 145, shipping: 12, tax: 22.6, total: 179.6 },
      });

    expect(res.status).toBe(201);
    expect(res.body.order.id).toMatch(/^VSN-\d{6}$/);
    expect(res.body.order.status).toBe("Paid");
    expect(res.body.order.payment).toContain("4242");
    expect(res.body.order.items).toBe(1);
    expect(res.body.order).toHaveProperty("estimatedDelivery");

    // Order + succeeded transaction persisted
    const db = await pool.query(
      `SELECT o.fulfillment_status, st.status AS tx, st.stripe_payment_intent_id
       FROM orders o JOIN stripe_transactions st ON st.order_id = o.id
       WHERE o.order_number = $1`,
      [res.body.order.id]
    );
    expect(db.rows[0].fulfillment_status).toBe("Paid");
    expect(db.rows[0].tx).toBe("succeeded");
    expect(db.rows[0].stripe_payment_intent_id).toBe(piId);

    // Stock decremented
    const after = (await pool.query("SELECT stock_quantity FROM product_variants WHERE id = $1", [variant.id])).rows[0].stock_quantity;
    expect(after).toBe(Number(before) - 1);
  });

  test("rejects a non-succeeded PaymentIntent with 422", async () => {
    const failPi = `pi_mock_fail_${RUN}`;
    mockPIRetrieve.mockResolvedValue({ id: failPi, status: "requires_payment_method" });

    const res = await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({
        paymentIntentId: failPi,
        lineItems: [{ variantId: 1, qty: 1, price: 1000 }],
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/not completed/i);
  });

  test("rejects missing paymentIntentId with 400", async () => {
    const res = await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({ lineItems: [] });
    expect(res.status).toBe(400);
  });
});

function exchangeEmail() {
  return `co_${Date.now()}_${Math.floor(Math.random() * 10000)}@test.com`;
}