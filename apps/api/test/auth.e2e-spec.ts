import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, resetDatabase } from "./utils/test-app";

describe("Auth (e2e)", () => {
  let app: INestApplication;
  let server: any;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it("makes the first registered user an ADMIN and subsequent users USER", async () => {
    const first = await request(server)
      .post("/api/v1/auth/register")
      .send({ email: "admin@test.local", username: "admin", password: "SuperSecret123" })
      .expect(201);
    expect(first.body.user.role).toBe("ADMIN");

    const second = await request(server)
      .post("/api/v1/auth/register")
      .send({ email: "user@test.local", username: "user1", password: "SuperSecret123" })
      .expect(201);
    expect(second.body.user.role).toBe("USER");
  });

  it("rejects registration with a weak password", async () => {
    await request(server)
      .post("/api/v1/auth/register")
      .send({ email: "weak@test.local", username: "weakuser", password: "short" })
      .expect(400);
  });

  it("rejects duplicate email/username", async () => {
    await request(server)
      .post("/api/v1/auth/register")
      .send({ email: "dup@test.local", username: "dupuser", password: "SuperSecret123" })
      .expect(201);
    await request(server)
      .post("/api/v1/auth/register")
      .send({ email: "dup@test.local", username: "otheruser", password: "SuperSecret123" })
      .expect(409);
  });

  it("logs in with correct credentials and rejects wrong ones", async () => {
    await request(server)
      .post("/api/v1/auth/register")
      .send({ email: "login@test.local", username: "loginuser", password: "SuperSecret123" })
      .expect(201);

    await request(server)
      .post("/api/v1/auth/login")
      .send({ email: "login@test.local", password: "WrongPassword1" })
      .expect(401);

    const res = await request(server)
      .post("/api/v1/auth/login")
      .send({ email: "login@test.local", password: "SuperSecret123" })
      .expect(201);
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.tokens.refreshToken).toBeDefined();
  });

  it("rejects requests without a bearer token", async () => {
    await request(server).get("/api/v1/me").expect(401);
  });

  it("rejects requests with a malformed token", async () => {
    await request(server).get("/api/v1/me").set("Authorization", "Bearer garbage.token.value").expect(401);
  });

  it("rotates refresh tokens and rejects reuse of an already-rotated token", async () => {
    const reg = await request(server)
      .post("/api/v1/auth/register")
      .send({ email: "rotate@test.local", username: "rotateuser", password: "SuperSecret123" })
      .expect(201);
    const originalRefresh = reg.body.tokens.refreshToken;

    const rotated = await request(server)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: originalRefresh })
      .expect(201);
    expect(rotated.body.refreshToken).not.toBe(originalRefresh);

    // Reusing the old token is rejected...
    await request(server).post("/api/v1/auth/refresh").send({ refreshToken: originalRefresh }).expect(401);
    // ...and as a theft-detection side effect, the newly rotated token is revoked too.
    await request(server).post("/api/v1/auth/refresh").send({ refreshToken: rotated.body.refreshToken }).expect(401);
  });

  it("changes password and invalidates existing refresh tokens", async () => {
    const reg = await request(server)
      .post("/api/v1/auth/register")
      .send({ email: "changepw@test.local", username: "changepwuser", password: "SuperSecret123" })
      .expect(201);

    await request(server)
      .post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${reg.body.tokens.accessToken}`)
      .send({ currentPassword: "WrongPassword1", newPassword: "NewSuperSecret123" })
      .expect(400);

    await request(server)
      .post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${reg.body.tokens.accessToken}`)
      .send({ currentPassword: "SuperSecret123", newPassword: "NewSuperSecret123" })
      .expect(201);

    await request(server)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: reg.body.tokens.refreshToken })
      .expect(401);

    await request(server)
      .post("/api/v1/auth/login")
      .send({ email: "changepw@test.local", password: "NewSuperSecret123" })
      .expect(201);
  });

  it("logs out and revokes the refresh token", async () => {
    const reg = await request(server)
      .post("/api/v1/auth/register")
      .send({ email: "logout@test.local", username: "logoutuser", password: "SuperSecret123" })
      .expect(201);

    await request(server)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${reg.body.tokens.accessToken}`)
      .send({ refreshToken: reg.body.tokens.refreshToken })
      .expect(201);

    await request(server)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: reg.body.tokens.refreshToken })
      .expect(401);
  });
});
