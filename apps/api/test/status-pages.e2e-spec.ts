import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, resetDatabase } from "./utils/test-app";

describe("Status Pages (e2e)", () => {
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
      .send({ email: "statuspage@test.local", username: "statuspageuser", password: "SuperSecret123" })
      .expect(201);
    userToken = reg.body.tokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a status page, attaches a monitor, and serves it publicly without auth", async () => {
    const monitor = await request(server)
      .post("/api/v1/monitors")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "Public Service", type: "HTTP", target: "https://example.com" })
      .expect(201);

    const page = await request(server)
      .post("/api/v1/status-pages")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "My Status", slug: "my-status", isPublic: true })
      .expect(201);

    await request(server)
      .post(`/api/v1/status-pages/${page.body.id}/monitors/${monitor.body.id}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ order: 0 })
      .expect(201);

    const publicView = await request(server).get("/api/v1/status-pages/public/my-status").expect(200);
    expect(publicView.body.name).toBe("My Status");
    expect(publicView.body.monitors).toHaveLength(1);
    expect(publicView.body.monitors[0].name).toBe("Public Service");
  });

  it("does not expose a private status page publicly", async () => {
    await request(server)
      .post("/api/v1/status-pages")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "Private", slug: "private-page", isPublic: false })
      .expect(201);

    await request(server).get("/api/v1/status-pages/public/private-page").expect(404);
  });

  it("returns 404 for an unknown slug", async () => {
    await request(server).get("/api/v1/status-pages/public/does-not-exist").expect(404);
  });

  it("rejects a duplicate slug", async () => {
    await request(server)
      .post("/api/v1/status-pages")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "First", slug: "dup-slug" })
      .expect(201);
    await request(server)
      .post("/api/v1/status-pages")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "Second", slug: "dup-slug" })
      .expect(409);
  });
});
