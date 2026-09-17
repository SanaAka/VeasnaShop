// Smoke test for Veasna Shop API.
// Requires the Docker Postgres on DATABASE_URL (localhost:5433).
// Stripe calls are MOCKED via mock-require so no real keys are needed.

let mockCounter = 0;

const MockStripe = (key) => ({
  paymentIntents: {
    create: async () => {
      mockCounter += 1;
      const id = `pi_mock_${Date.now()}_${mockCounter}`;
      return { id, client_secret: `${id}_secret_mock` };
    },
    retrieve: async (id) => ({
      id,
      status: "succeeded",
      amount: 29000,
      payment_method: "pm_mock_1",
    }),
  },
  paymentMethods: {
    retrieve: async () => ({ card: { brand: "visa", last4: "4242" } }),
  },
  webhooks: {
    constructEvent: (body) =>
      JSON.parse(Buffer.isBuffer(body) ? body.toString("utf8") : body),
  },
});

require("mock-require")("stripe", MockStripe);

process.env.PORT = "5099";

const app = require("../server");
const pool = require("../config/db");

const BASE = "http://localhost:5099";

let passed = 0;
let failed = 0;

function report(name, cond, extra) {
  if (cond) {
    passed++;
    console.log(`  ok - ${name}`);
  } else {
    failed++;
    console.error(`  FAIL - ${name}${extra ? ` | ${extra}` : ""}`);
  }
}

const jsonGet = async (path, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${BASE}${path}`, { headers });
  return { status: res.status, body: await res.json() };
};

const jsonPost = async (path, body, token) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};

const waitForServer = async () => {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return true;
    } catch (_) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return false;
};

(async () => {
  console.log("== Waiting for API ==");
  report("server boots and is reachable", await waitForServer());

  const uid = Date.now();

  // 1. Auth
  console.log("== Auth ==");
  const reg = await jsonPost("/api/auth/register", {
    name: "Smoke Tester",
    email: `smoke_${uid}@test.com`,
    password: "test123",
  });
  report(
    "register returns token + user (with name)",
    reg.status === 201 && !!reg.body.token && reg.body.user.name === "Smoke Tester"
  );

  const login = await jsonPost("/api/auth/login", {
    email: "admin@veasnashop.com",
    password: "admin123",
  });
  report("seed admin can login", login.status === 200 && login.body.user.role === "admin");
  const adminToken = login.body.token;

  const clogin = await jsonPost("/api/auth/login", {
    email: "customer@veasnashop.com",
    password: "customer123",
  });
  report("seed customer can login", clogin.status === 200);
  const customerToken = clogin.body.token;

  const badLogin = await jsonPost("/api/auth/login", {
    email: "admin@veasnashop.com",
    password: "wrong",
  });
  report("wrong password rejected (401)", badLogin.status === 401);

  const me = await jsonGet("/api/auth/me", customerToken);
  report("GET /auth/me returns profile", me.status === 200 && me.body.user.email === "customer@veasnashop.com");

  // 2. Catalog
  console.log("== Catalog ==");
  const products = await jsonGet("/api/products");
  report(
    "GET /products (contract shape)",
    products.status === 200 && products.body.products.length >= 10 &&
      "categorySlug" in products.body.products[0],
    `count=${products.body.products && products.body.products.length}`
  );

  const filtered = await jsonGet("/api/products?category=ceramics-table&sort=price-asc");
  report(
    "GET /products with category filter",
    filtered.status === 200 && filtered.body.products.length > 0 &&
      filtered.body.products.every((p) => p.categorySlug === "ceramics-table")
  );

  const byId = await jsonGet("/api/products/4");
  report(
    "GET /products/:id with variantOptions",
    byId.status === 200 && byId.body.product.variantOptions.size.length === 3,
    JSON.stringify(byId.body.product && byId.body.product.variantOptions)
  );

  const pairing = await jsonGet("/api/products/5/pairing");
  report(
    "GET /products/:id/pairing",
    pairing.status === 200 && pairing.body.items.length > 0,
    `items=${pairing.body.items && pairing.body.items.length}`
  );

  // 3. Admin
  console.log("== Admin ==");
  const adminProducts = await jsonGet("/api/admin/products", adminToken);
  report(
    "GET /admin/products",
    adminProducts.status === 200 && adminProducts.body.products.length >= 10,
    `count=${adminProducts.body.products && adminProducts.body.products.length}`
  );

  const denied = await jsonPost(
    "/api/admin/dashboard",
    {},
    customerToken
  );
  report("customer blocked from admin routes (403)", denied.status === 403);

  // Clean up product created by a previous run
  await pool.query(`DELETE FROM order_items WHERE product_id IN (SELECT id FROM products WHERE slug = 'smoke-vessel')`);
  await pool.query(`DELETE FROM products WHERE slug = 'smoke-vessel'`);

  const created = await jsonPost(
    "/api/admin/products",
    {
      name: "Smoke Vessel",
      slug: "smoke-vessel",
      description: "auto test",
      base_price: 25,
      category_id: 2,
      tag: "Trial",
      variants: [
        { sku: `SMK-${uid}`, variant_type: "color", variant_name: "Black", price_adjustment: 0, stock_quantity: 30 },
      ],
    },
    adminToken
  );
  report(
    "POST /admin/products (transaction + variants)",
    created.status === 201 && created.body.product.variants.length === 1,
    JSON.stringify(created.body && created.body.product)
  );

  const dashboard = await jsonGet("/api/admin/dashboard", adminToken);
  report(
    "GET /admin/dashboard returns kpis",
    dashboard.status === 200 && dashboard.body.kpis.length === 4,
    JSON.stringify(dashboard.body && dashboard.body.kpis)
  );

  // 4. Checkout (mocked Stripe Payment Element flow)
  console.log("== Checkout (mocked) ==");
  const variantRes = await pool.query(
    "SELECT * FROM product_variants WHERE sku = 'PLR-M-L'"
  );
  const robeVariant = variantRes.rows[0];
  const stockBefore = robeVariant.stock_quantity;

  const pi = await jsonPost(
    "/api/checkout/payment-intent",
    {
      amount: 29000,
      currency: "usd",
      customer: { name: "Elena R.", email: "customer@veasnashop.com" },
    },
    customerToken
  );
  report(
    "POST /checkout/payment-intent returns clientSecret",
    pi.status === 200 && typeof pi.body.clientSecret === "string" && pi.body.clientSecret.includes("pi_mock_"),
    JSON.stringify(pi.body)
  );

  const paymentIntentId = pi.body.clientSecret.split("_secret_")[0];

  const orderRes = await jsonPost(
    "/api/checkout",
    {
      paymentIntentId,
      billing: { name: "Elena R.", email: "customer@veasnashop.com" },
      shipping: { line1: "742 Evergreen Terrace", city: "Portland", state: "OR", zip: "97201", country: "US" },
      lineItems: [
        { variantId: robeVariant.id, productId: 4, name: "Pure Washed Organic Linen Robe", qty: 2, price: 14500, sku: "PLR-M-L", variant: "M / L" },
      ],
      totals: { subtotal: 290, wrapFee: 0, shipping: 12, tax: 22.6, discount: 0, total: 324.6 },
    },
    customerToken
  );
  report(
    "POST /checkout creates order (VSN-...)",
    orderRes.status === 201 && orderRes.body.order.id.startsWith("VSN-") && orderRes.body.order.status === "Paid",
    JSON.stringify(orderRes.body)
  );

  const dbOrder = await pool.query(
    `SELECT o.id, o.order_number, o.total_amount, o.fulfillment_status, st.status AS tx_status,
            st.stripe_payment_intent_id
     FROM orders o JOIN stripe_transactions st ON st.order_id = o.id
     ORDER BY o.id DESC LIMIT 1`
  );
  report(
    "order + succeeded transaction persisted",
    dbOrder.rows.length === 1 && dbOrder.rows[0].fulfillment_status === "Paid" &&
      dbOrder.rows[0].tx_status === "succeeded" &&
      dbOrder.rows[0].stripe_payment_intent_id === paymentIntentId,
    JSON.stringify(dbOrder.rows)
  );

  const stockAfter = await pool.query(
    "SELECT stock_quantity FROM product_variants WHERE id = $1",
    [robeVariant.id]
  );
  report(
    "stock decremented at order creation",
    Number(stockAfter.rows[0].stock_quantity) === Number(stockBefore) - 2,
    `before=${stockBefore} after=${stockAfter.rows[0].stock_quantity}`
  );

  // 5. Orders + user dashboard
  console.log("== Orders & account ==");
  const orders = await jsonGet("/api/orders", customerToken);
  report(
    "GET /orders lists the created order",
    orders.status === 200 && orders.body.orders.length >= 1 &&
      orders.body.orders.some((o) => o.id === dbOrder.rows[0].order_number),
    JSON.stringify(orders.body.orders && orders.body.orders[0])
  );

  const orderDetail = await jsonGet(`/api/orders/${dbOrder.rows[0].order_number}`, customerToken);
  report(
    "GET /orders/:id detail",
    orderDetail.status === 200 && orderDetail.body.order.items.length === 1,
    JSON.stringify(orderDetail.body.order)
  );

  const dash = await jsonGet("/api/me/dashboard", customerToken);
  report(
    "GET /me/dashboard with stats + recentOrders",
    dash.status === 200 && dash.body.stats.length === 2 && dash.body.recentOrders.length >= 1
  );

  await jsonPost("/api/me/wishlist", { productId: 5 }, customerToken);
  const wishlist = await jsonGet("/api/me/wishlist", customerToken);
  report(
    "GET /me/wishlist after add",
    wishlist.status === 200 && wishlist.body.items.some((i) => i.id === 5)
  );

  // 6. Newsletter
  console.log("== Newsletter ==");
  const nl = await jsonPost("/api/newsletter/subscribe", { email: `news_${uid}@test.com` });
  report("POST /newsletter/subscribe", nl.status === 200 && nl.body.subscribed === true);

  console.log(`\n== Summary: ${passed} passed, ${failed} failed ==`);
  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error("Suit crashed:", err);
  process.exit(1);
});