const RUN = Date.now();

const mockPIRetrieve = jest.fn();
const mockPMRetrieve = jest.fn();
const mockPICreate = jest.fn();

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
      constructEvent: () => ({}),
    },
  }))
);

const request = require("supertest");
const app = require("../../app");
const pool = require("../../config/db");

afterAll(async () => {
  await pool.end();
});

let adminToken;
let customerToken;
let createdProductId;

const uniqueName = (p) => `${p}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

beforeAll(async () => {
  const admin = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@veasnashop.com", password: "admin123" });
  adminToken = admin.body.token;

  const customer = await request(app)
    .post("/api/auth/register")
    .send({ name: "Admin Tester", email: `adm_${Date.now()}_${Math.floor(Math.random() * 10000)}@test.com`, password: "secret123" });
  customerToken = customer.body.token;
});

describe("Admin authorization", () => {
  test("customer is forbidden from admin routes (403)", async () => {
    const res = await request(app)
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });

  test("no token is rejected (401)", async () => {
    const res = await request(app).get("/api/admin/dashboard");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/admin/dashboard", () => {
  test("returns kpis, chart, departments, orders, lowStock, activity", async () => {
    const res = await request(app)
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.kpis).toHaveLength(4);
    const gross = res.body.kpis.find((k) => k.label === "Gross Revenue");
    expect(gross).toBeDefined();
    expect(gross.value).toMatch(/^\$\d/);
    expect(gross).toHaveProperty("iconCls");
    expect(res.body.chart).toHaveProperty(["series"]);
    expect(res.body.departments.length).toBeGreaterThanOrEqual(1);
    expect(res.body.departments[0]).toHaveProperty("pct");
    expect(res.body.departments[0]).toHaveProperty("color");
    expect(Array.isArray(res.body.orders)).toBe(true);
    if (res.body.orders.length > 0) {
      const row = res.body.orders[0];
      expect(row).toHaveProperty("item");
      expect(row).toHaveProperty("sub");
      expect(row).toHaveProperty("initials");
      expect(row).toHaveProperty("initialsCls");
      expect(row.fulfilment).toMatchObject({ text: expect.any(String), cls: expect.any(String) });
      expect(row).toHaveProperty("status");
    }
    expect(Array.isArray(res.body.lowStock)).toBe(true);
    expect(Array.isArray(res.body.activity)).toBe(true);
  });
});

describe("Admin products CRUD", () => {
  test("lists products in contract shape", async () => {
    const res = await request(app)
      .get("/api/admin/products")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.products.length).toBeGreaterThanOrEqual(10);
    const p = res.body.products[0];
    expect(p).toHaveProperty("colors");
    expect(Array.isArray(p.colors)).toBe(true);
    expect(p).toHaveProperty("provenance");
    expect(p).toHaveProperty("units");
    expect(p).toHaveProperty("status");
    expect(["Published", "Draft"]).toContain(p.status);
    expect(Array.isArray(p.variants)).toBe(true);
    if (p.variants.length > 0) {
      expect(p.variants[0]).toHaveProperty("badge");
      expect(p.variants[0]).toHaveProperty("sku");
      expect(p.variants[0]).toHaveProperty("color");
    }
  });

  test("creates a product with variants", async () => {
    const res = await request(app)
      .post("/api/admin/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: uniqueName("AdminVessel"),
        slug: `admin-vessel-${Date.now()}`,
        description: "integration test",
        base_price: 50,
        category_id: 2,
        tag: "Trial",
        color: "#112233",
        variants: [
          { sku: `ADM-${Date.now()}-BLK`, variant_type: "color", variant_name: "Matte Black", price_adjustment: 0, stock_quantity: 7, color: "#112233" },
          { sku: `ADM-${Date.now()}-WHT`, variant_type: "color", variant_name: "Ivory", price_adjustment: 5, stock_quantity: 0, color: "#EEEEEE" },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.product.variants).toHaveLength(2);
    createdProductId = res.body.product.id;
  });

  test("gets a single product", async () => {
    const res = await request(app)
      .get(`/api/admin/products/${createdProductId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.product.id).toBe(createdProductId);
  });

  test("updates a product", async () => {
    const res = await request(app)
      .put(`/api/admin/products/${createdProductId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ base_price: 60, tag: "Updated" });
    expect(res.status).toBe(200);
    expect(res.body.product.base_price).toBe("60.00");
  });

  test("updates a variant by sku", async () => {
    const product = (await pool.query("SELECT id FROM products WHERE id = $1", [createdProductId])).rows[0];
    const variant = (await pool.query("SELECT * FROM product_variants WHERE product_id = $1 ORDER BY id LIMIT 1", [product.id])).rows[0];
    const res = await request(app)
      .patch(`/api/admin/products/${product.id}/variants/${variant.sku}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ stock: 3 });
    expect(res.status).toBe(200);
    expect(res.body.variant.stock_quantity).toBe(3);
  });

  test("bulk updates products", async () => {
    const res = await request(app)
      .patch("/api/admin/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ products: [{ id: createdProductId, is_active: false, price: 45 }] });
    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(1);
  });

  test("deletes a product", async () => {
    const res = await request(app)
      .delete(`/api/admin/products/${createdProductId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);
  });
});

describe("Admin categories", () => {
  test("lists taxonomy tree", async () => {
    const res = await request(app)
      .get("/api/admin/categories")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.categories.length).toBeGreaterThanOrEqual(1);
    expect(res.body.categories[0]).toHaveProperty("status");
    expect(res.body.categories[0]).toHaveProperty("badge");
    expect(res.body.categories[0]).toHaveProperty("children");
    expect(res.body.categories[0].children[0]).toHaveProperty("featureMenu");
  });

  test("creates, updates, then deletes a category", async () => {
    await pool.query("DELETE FROM categories WHERE name = 'New Category'");
    const slug = `cat-${Date.now()}`;
    const create = await request(app)
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "New Category", slug, parent_id: 1 });
    expect(create.status).toBe(201);
    const id = create.body.category.id;

    const update = await request(app)
      .put(`/api/admin/categories/${id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ description: "updated" });
    expect(update.status).toBe(200);
    expect(update.body.category.description).toBe("updated");

    const del = await request(app)
      .delete(`/api/admin/categories/${id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(del.status).toBe(200);
  });

  test("returns 422 for duplicate slug", async () => {
    const res = await request(app)
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Dup", slug: "ceramics-table" });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/already exists/i);
  });
});

describe("Admin orders — fulfilment queue", () => {
  test("lists orders with contract fields", async () => {
    const res = await request(app)
      .get("/api/admin/orders")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(res.body.stats).toHaveLength(4);
    for (const s of res.body.stats) {
      expect(s).toHaveProperty("icon");
      expect(s).toHaveProperty("cls");
    }
    if (res.body.orders.length > 0) {
      const o = res.body.orders[0];
      expect(o.id.startsWith("#")).toBe(true);
      expect(o).toHaveProperty("initials");
      expect(o).toHaveProperty("loc");
      expect(o).toHaveProperty("payment");
      expect(o.fulfilment).toMatchObject({ text: expect.any(String), cls: expect.any(String) });
    }
  });

  test("fulfils an order from Paid → shipped and reflects in customer view", async () => {
    // Create an order via the mocked-Stripe checkout flow
    const piId = `pi_admin_succ_${RUN}`;
    mockPIRetrieve.mockResolvedValue({
      id: piId,
      status: "succeeded",
      amount: 10000,
      payment_method: "pm_admin",
    });
    mockPMRetrieve.mockResolvedValue({ card: { last4: "4242" } });

    const spec = (await pool.query("SELECT id FROM products WHERE id = 5")).rows[0];
    const variant = (await pool.query("SELECT id FROM product_variants WHERE product_id = 5 ORDER BY id LIMIT 1")).rows[0];

    const checkout = await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        paymentIntentId: piId,
        billing: { name: "Elena R.", email: "customer@veasnashop.com" },
        shipping: { line1: "1 Fulfil Way", city: "Portland", state: "OR", zip: "97201", country: "US" },
        lineItems: [{ variantId: variant.id, productId: spec.id, name: "Test Cand", qty: 1, price: 10000, sku: variant.sku }],
        totals: { subtotal: 100, total: 134.6 },
      });
    expect(checkout.status).toBe(201);
    const orderId = checkout.body.order.id;

    const fulfil = await request(app)
      .patch(`/api/admin/orders/${orderId}/fulfil`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(fulfil.status).toBe(200);
    expect(["shipped", "delivered"]).toContain(fulfil.body.order.fulfillment_status);

    const detail = await request(app)
      .get(`/api/admin/orders/${orderId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.order.items.length).toBeGreaterThanOrEqual(1);
  });

  test("returns 404 for unknown order fulfil", async () => {
    const res = await request(app)
      .patch("/api/admin/orders/VSN-000000/fulfil")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});