const request = require("supertest");
const app = require("../../app");
const pool = require("../../config/db");

afterAll(async () => {
  await pool.end();
});

const uniqueEmail = () =>
  `acc_${Date.now()}_${Math.floor(Math.random() * 10000)}@test.com`;

let token;
let userId;

beforeAll(async () => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Account Tester", email: uniqueEmail(), password: "secret123" });
  token = res.body.token;
  userId = res.body.user.id;
});

describe("GET /api/orders (customer)", () => {
  test("requires auth", async () => {
    const res = await request(app).get("/api/orders");
    expect(res.status).toBe(401);
  });

  test("returns empty orders list for fresh user", async () => {
    const res = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.orders).toEqual([]);
  });
});

describe("GET /api/me/orders (alias)", () => {
  test("returns the same order shape as /api/orders", async () => {
    const res = await request(app)
      .get("/api/me/orders")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.orders)).toBe(true);
  });
});

describe("GET /api/me/dashboard", () => {
  test("returns user, stats and recentOrders", async () => {
    const res = await request(app)
      .get("/api/me/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(userId);
    expect(res.body.user.name).toBe("Account Tester");
    expect(res.body.stats).toHaveLength(2);
    expect(res.body.stats[0]).toHaveProperty("label");
    expect(res.body.stats[0]).toHaveProperty("value");
    expect(res.body.recentOrders).toEqual([]);
  });
});

describe("Wishlist", () => {
  test("add, list, and remove a product", async () => {
    const add = await request(app)
      .post("/api/me/wishlist")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: 6 });
    expect(add.status).toBe(201);
    expect(add.body.added).toBe(true);

    const list = await request(app)
      .get("/api/me/wishlist")
      .set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.items.some((i) => i.id === 6)).toBe(true);

    const del = await request(app)
      .delete("/api/me/wishlist/6")
      .set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(200);
    expect(del.body.removed).toBe(true);

    const after = await request(app)
      .get("/api/me/wishlist")
      .set("Authorization", `Bearer ${token}`);
    expect(after.body.items.some((i) => i.id === 6)).toBe(false);
  });
});

describe("Addresses", () => {
  test("create, list, update and delete an address", async () => {
    const create = await request(app)
      .post("/api/me/addresses")
      .set("Authorization", `Bearer ${token}`)
      .send({ label: "Home", line1: "123 Test Ave", city: "Portland", state: "OR", zip: "97201", is_default: true });
    expect(create.status).toBe(201);
    const addressId = create.body.id;

    const list = await request(app)
      .get("/api/me/addresses")
      .set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.length).toBeGreaterThanOrEqual(1);

    const del = await request(app)
      .delete(`/api/me/addresses/${addressId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(200);
  });

  test("rejects address without required fields", async () => {
    const res = await request(app)
      .post("/api/me/addresses")
      .set("Authorization", `Bearer ${token}`)
      .send({ line1: "only line1" });
    expect(res.status).toBe(400);
  });
});

describe("Ritual profile", () => {
  test("returns empty default then updates", async () => {
    const get = await request(app)
      .get("/api/me/rituals")
      .set("Authorization", `Bearer ${token}`);
    expect(get.status).toBe(200);

    const update = await request(app)
      .post("/api/me/rituals")
      .set("Authorization", `Bearer ${token}`)
      .send({ skin_type: "sensitive", scent_preferences: "woody, earthy" });
    expect(update.status).toBe(200);
    expect(update.body.updated).toBe(true);

    const after = await request(app)
      .get("/api/me/rituals")
      .set("Authorization", `Bearer ${token}`);
    expect(after.body.skin_type).toBe("sensitive");
  });
});

describe("Settings", () => {
  test("updates name and logs in with new password", async () => {
    const res = await request(app)
      .patch("/api/me/settings")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Renamed Tester", password: "newpass123" });
    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(true);

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(me.body.user.name).toBe("Renamed Tester");
  });
});

describe("POST /api/newsletter/subscribe", () => {
  test("subscribes an email (idempotent)", async () => {
    const email = uniqueEmail();
    const first = await request(app)
      .post("/api/newsletter/subscribe")
      .send({ email });
    expect(first.status).toBe(200);
    expect(first.body.subscribed).toBe(true);

    const second = await request(app)
      .post("/api/newsletter/subscribe")
      .send({ email });
    expect(second.status).toBe(200);
  });
});