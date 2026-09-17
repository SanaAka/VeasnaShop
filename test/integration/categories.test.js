const request = require("supertest");
const app = require("../../app");
const pool = require("../../config/db");

afterAll(async () => {
  await pool.end();
});

describe("GET /api/categories", () => {
  test("returns top-level categories with children and counts", async () => {
    const res = await request(app).get("/api/categories");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.categories)).toBe(true);
    expect(res.body.categories.length).toBeGreaterThanOrEqual(4);

    const living = res.body.categories.find((c) => c.slug === "living");
    expect(living).toBeDefined();
    expect(living).toHaveProperty("description");
    expect(living).toHaveProperty("count");
    expect(living.children.length).toBeGreaterThanOrEqual(1);

    const child = living.children[0];
    expect(child).toHaveProperty("slug");
    expect(child).toHaveProperty("name");
    expect(child).toHaveProperty("items");
  });

  test("category slugs match contract-known slugs", async () => {
    const res = await request(app).get("/api/categories");
    const known = ["ceramics-table", "apparel-linen", "scents-botanicals", "textiles-linen"];
    const parentSlugs = res.body.categories.map((c) => c.slug);
    const childSlugs = res.body.categories.flatMap((c) => c.children.map((ch) => ch.slug));
    const all = [...parentSlugs, ...childSlugs];
    for (const slug of known) {
      expect(all).toContain(slug);
    }
  });
});