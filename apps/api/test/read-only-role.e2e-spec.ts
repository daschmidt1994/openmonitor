import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, resetDatabase } from "./utils/test-app";

describe("READONLY role enforcement (e2e)", () => {
  let app: INestApplication;
  let server: any;
  let adminToken: string;
  let readOnlyToken: string;
  let readOnlyUserId: string;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    const admin = await request(server)
      .post("/api/v1/auth/register")
      .send({ email: "ro-admin@test.local", username: "roadmin", password: "SuperSecret123" })
      .expect(201); // first user => ADMIN
    adminToken = admin.body.tokens.accessToken;

    const ro = await request(server)
      .post("/api/v1/auth/register")
      .send({ email: "readonly@test.local", username: "readonlyuser", password: "SuperSecret123" })
      .expect(201);
    readOnlyUserId = ro.body.user.id;

    await request(server)
      .patch(`/api/v1/users/${readOnlyUserId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "READONLY" })
      .expect(200);

    const login = await request(server)
      .post("/api/v1/auth/login")
      .send({ email: "readonly@test.local", password: "SuperSecret123" })
      .expect(201);
    readOnlyToken = login.body.tokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("allows a READONLY user to read monitors", async () => {
    await request(server).get("/api/v1/monitors").set("Authorization", `Bearer ${readOnlyToken}`).expect(200);
  });

  it("blocks a READONLY user from creating a monitor", async () => {
    const res = await request(server)
      .post("/api/v1/monitors")
      .set("Authorization", `Bearer ${readOnlyToken}`)
      .send({ name: "x", type: "HTTP", target: "https://x.com" })
      .expect(403);
    expect(res.body.message).toMatch(/read-only/i);
  });

  it("still allows a READONLY user to change their own password", async () => {
    await request(server)
      .post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${readOnlyToken}`)
      .send({ currentPassword: "SuperSecret123", newPassword: "NewSuperSecret123" })
      .expect(201);
  });
});
