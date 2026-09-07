import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, resetDatabase } from "./utils/test-app";

async function registerAndLogin(server: any, email: string, username: string) {
  const res = await request(server)
    .post("/api/v1/auth/register")
    .send({ email, username, password: "SuperSecret123" })
    .expect(201);
  return res.body.tokens.accessToken as string;
}

describe("Monitors (e2e)", () => {
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

  it("performs full CRUD for the owning user", async () => {
    const token = await registerAndLogin(server, "owner@test.local", "owner");

    const create = await request(server)
      .post("/api/v1/monitors")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "My API", type: "HTTP", target: "https://example.com", interval: 30, timeout: 5 })
      .expect(201);
    expect(create.body.currentStatus).toBe("PENDING");
    const id = create.body.id;

    await request(server).get(`/api/v1/monitors/${id}`).set("Authorization", `Bearer ${token}`).expect(200);

    const update = await request(server)
      .patch(`/api/v1/monitors/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "My API Renamed", active: false })
      .expect(200);
    expect(update.body.name).toBe("My API Renamed");
    expect(update.body.active).toBe(false);

    const list = await request(server).get("/api/v1/monitors").set("Authorization", `Bearer ${token}`).expect(200);
    expect(list.body.meta.total).toBe(1);

    await request(server).delete(`/api/v1/monitors/${id}`).set("Authorization", `Bearer ${token}`).expect(200);
    await request(server).get(`/api/v1/monitors/${id}`).set("Authorization", `Bearer ${token}`).expect(404);
  });

  it("rejects invalid monitor payloads", async () => {
    const token = await registerAndLogin(server, "validator@test.local", "validator");
    await request(server)
      .post("/api/v1/monitors")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "", type: "NOT_A_TYPE", target: "" })
      .expect(400);
  });

  it("never lets user B read, modify or delete user A's monitor by guessing/reusing its id", async () => {
    const tokenA = await registerAndLogin(server, "a@test.local", "usera");
    const tokenB = await registerAndLogin(server, "b@test.local", "userb");

    const created = await request(server)
      .post("/api/v1/monitors")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "A's secret monitor", type: "HTTP", target: "https://a-secret.example.com" })
      .expect(201);
    const id = created.body.id;

    await request(server).get(`/api/v1/monitors/${id}`).set("Authorization", `Bearer ${tokenB}`).expect(404);
    await request(server)
      .patch(`/api/v1/monitors/${id}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ name: "hijacked" })
      .expect(404);
    await request(server).delete(`/api/v1/monitors/${id}`).set("Authorization", `Bearer ${tokenB}`).expect(404);

    // B's own monitor list must stay empty, and A's monitor must still exist untouched.
    const listB = await request(server).get("/api/v1/monitors").set("Authorization", `Bearer ${tokenB}`).expect(200);
    expect(listB.body.data).toHaveLength(0);

    const stillThere = await request(server).get(`/api/v1/monitors/${id}`).set("Authorization", `Bearer ${tokenA}`).expect(200);
    expect(stillThere.body.name).toBe("A's secret monitor");
  });

  it("lets an admin see every user's monitors only when explicitly requesting all=true", async () => {
    const adminToken = await registerAndLogin(server, "admin2@test.local", "admin2"); // first user => ADMIN
    const userToken = await registerAndLogin(server, "regular@test.local", "regularu");

    await request(server)
      .post("/api/v1/monitors")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "Regular user's monitor", type: "TCP", target: "example.com", port: 443 })
      .expect(201);

    const adminOwnList = await request(server).get("/api/v1/monitors").set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(adminOwnList.body.data).toHaveLength(0);

    const adminAllList = await request(server)
      .get("/api/v1/monitors?all=true")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(adminAllList.body.data).toHaveLength(1);
  });
});
