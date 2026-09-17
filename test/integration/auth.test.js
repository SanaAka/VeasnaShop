const request = require("supertest");
const app = require("../../app");
const pool = require("../../config/db");

afterAll(async () => {
  await pool.end();
});

const uniqueEmail = () =>
  `jest_${Date.now()}_${Math.floor(Math.random() * 10000)}@test.com`;

describe("POST /api/auth/register", () => {
  test("registers a new user and returns a JWT", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: uniqueEmail(), password: "secret123" });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user.email).toMatch(/@test\.com$/);
    expect(res.body.user.role).toBe("customer");
    expect(res.body.user.password_hash).toBeUndefined();
  });

  test("rejects duplicate email with 409", async () => {
    const email = uniqueEmail();

    const first = await request(app)
      .post("/api/auth/register")
      .send({ email, password: "secret123" });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/auth/register")
      .send({ email, password: "secret123" });

    expect(second.status).toBe(409);
    expect(second.body.error).toMatch(/already/i);
  });

  test("rejects missing password with 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: uniqueEmail() });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test("rejects malformed email with 400 (no password)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ password: "secret123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });
});

describe("POST /api/auth/login", () => {
  test("logs in a registered user and returns a JWT", async () => {
    const email = uniqueEmail();
    await request(app)
      .post("/api/auth/register")
      .send({ email, password: "secret123" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "secret123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.password_hash).toBeUndefined();
  });

  test("rejects wrong password with 401", async () => {
    const email = uniqueEmail();
    await request(app)
      .post("/api/auth/register")
      .send({ email, password: "secret123" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid credentials");
  });

  test("rejects unknown email with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: uniqueEmail(), password: "secret123" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid credentials");
  });

  test("rejects missing fields with 400", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: uniqueEmail() });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });
});