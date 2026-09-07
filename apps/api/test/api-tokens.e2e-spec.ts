import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, resetDatabase } from "./utils/test-app";

describe("API Tokens (e2e)", () => {
  let app: INestApplication;
  let server: any;
  let userToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    const reg = await request(server)
      .post("/api/v1/auth/register")
      .send({ email: "tokens@test.local", username: "tokensuser", password: "SuperSecret123" })
      .expect(201);
    userToken = reg.body.tokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("issues a token whose plaintext value is shown only once and never persisted", async () => {
    const created = await request(server)
      .post("/api/v1/api-tokens")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "CI", scopes: ["monitors:read"] })
      .expect(201);

    expect(created.body.token).toMatch(/^om_/);
    expect(created.body.tokenHash).toBeUndefined();

    const list = await request(server).get("/api/v1/api-tokens").set("Authorization", `Bearer ${userToken}`).expect(200);
    expect(list.body[0].tokenHash).toBeUndefined();
    expect(list.body[0].tokenPrefix).toMatch(/^om_/);
  });

  it("authenticates API requests with the issued token and enforces its scopes", async () => {
    const created = await request(server)
      .post("/api/v1/api-tokens")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "Read only", scopes: ["monitors:read"] })
      .expect(201);
    const apiToken = created.body.token;

    await request(server).get("/api/v1/monitors").set("Authorization", `Bearer ${apiToken}`).expect(200);

    await request(server)
      .post("/api/v1/monitors")
      .set("Authorization", `Bearer ${apiToken}`)
      .send({ name: "x", type: "HTTP", target: "https://x.com" })
      .expect(403);
  });

  it("rejects a revoked token", async () => {
    const created = await request(server)
      .post("/api/v1/api-tokens")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "To revoke", scopes: ["monitors:read"] })
      .expect(201);
    const apiToken = created.body.token;

    await request(server).delete(`/api/v1/api-tokens/${created.body.id}`).set("Authorization", `Bearer ${userToken}`).expect(200);
    await request(server).get("/api/v1/monitors").set("Authorization", `Bearer ${apiToken}`).expect(401);
  });

  it("rejects a garbage bearer token that merely has the API token prefix", async () => {
    await request(server).get("/api/v1/monitors").set("Authorization", "Bearer om_not-a-real-token").expect(401);
  });
});
