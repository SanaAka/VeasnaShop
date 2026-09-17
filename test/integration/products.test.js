const request = require("supertest");
const app = require("../../app");
const pool = require("../../config/db");

afterAll(async () => {
  await pool.end();
});

describe("GET /api/products", () => {
  test("returns contract-shaped product list with category info", async () => {
    const res = await request(app).get("/api/products");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products.length).toBeGreaterThanOrEqual(10);
    const p = res.body.products[0];
    expect(p).toHaveProperty("id");
    expect(p).toHaveProperty("name");
    expect(p).toHaveProperty("price");
    expect(p).toHaveProperty("rating");
    expect(p).toHaveProperty("reviews");
    expect(p).toHaveProperty("category");
    expect(p).toHaveProperty("categorySlug");
    expect(p).toHaveProperty("color");
  });

  test("filters by category slug", async () => {
    const res = await request(app).get("/api/products?category=ceramics-table");
    expect(res.status).toBe(200);
    expect(res.body.products.length).toBeGreaterThan(0);
    expect(res.body.products.every((p) => p.categorySlug === "ceramics-table")).toBe(true);
  });

  test("filters by search (name/tag/category)", async () => {
    const res = await request(app).get("/api/products?search=candle");
    expect(res.body.products.length).toBeGreaterThan(0);
    expect(res.body.products[0].name.toLowerCase()).toContain("candle");
  });

  test("sorts by price ascending", async () => {
    const res = await request(app).get("/api/products?sort=price-asc");
    const prices = res.body.products.map((p) => Number(p.price));
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });
});

describe("GET /api/products/:id", () => {
  test("returns product with variantOptions groups", async () => {
    const res = await request(app).get("/api/products/4");

    expect(res.status).toBe(200);
    expect(res.body.product.name).toBe("Pure Washed Organic Linen Robe");
    expect(res.body.product.category).toBe("Washed Organic Linen");
    expect(res.body.product.variantOptions.size.length).toBe(3);
    expect(res.body.product.variantOptions.size).toContain("M / L");
  });

  test("returns 404 for unknown id", async () => {
    const res = await request(app).get("/api/products/99999");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

describe("GET /api/products/:id/pairing", () => {
  test("returns pairing items for a product", async () => {
    const res = await request(app).get("/api/products/5/pairing");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items[0]).toHaveProperty("name");
    expect(res.body.items[0]).toHaveProperty("category");
    expect(res.body.items[0]).toHaveProperty("price");
    expect(res.body.items[0]).toHaveProperty("detail");
  });

  test("returns empty items array when no pairings", async () => {
    const res = await request(app).get("/api/products/9/pairing");
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });
});