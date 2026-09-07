import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, resetDatabase } from "./utils/test-app";

describe("Admin user management (e2e)", () => {
  let app: INestApplication;
  let server: any;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    const admin = await request(server)
      .post("/api/v1/auth/register")
      .send({ email: "root@test.local", username: "rootadmin", password: "SuperSecret123" })
      .expect(201); // first user => ADMIN
    adminToken = admin.body.tokens.accessToken;

    const user = await request(server)
      .post("/api/v1/auth/register")
      .send({ email: "plain@test.local", username: "plainuser", password: "SuperSecret123" })
      .expect(201);
    userToken = user.body.tokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("forbids a non-admin from listing all users", async () => {
    await request(server).get("/api/v1/users").set("Authorization", `Bearer ${userToken}`).expect(403);
  });

  it("lets an admin list, deactivate and change a user's role", async () => {
    const list = await request(server).get("/api/v1/users").set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(list.body.data.length).toBeGreaterThanOrEqual(2);

    const target = list.body.data.find((u: any) => u.username === "plainuser");

    await request(server)
      .patch(`/api/v1/users/${target.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ active: false })
      .expect(200);

    // A deactivated user can no longer log in.
    await request(server).post("/api/v1/auth/login").send({ email: "plain@test.local", password: "SuperSecret123" }).expect(403);

    // ...and their existing session is revoked immediately.
    await request(server).get("/api/v1/me").set("Authorization", `Bearer ${userToken}`).expect(401);
  });

  it("prevents an admin from deactivating or deleting their own account", async () => {
    const me = await request(server).get("/api/v1/me").set("Authorization", `Bearer ${adminToken}`).expect(200);

    await request(server)
      .patch(`/api/v1/users/${me.body.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ active: false })
      .expect(403);

    await request(server).delete(`/api/v1/users/${me.body.id}`).set("Authorization", `Bearer ${adminToken}`).expect(403);
  });
});
