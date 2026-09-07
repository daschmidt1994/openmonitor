import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, resetDatabase } from "./utils/test-app";
import { PrismaService } from "../src/common/prisma/prisma.service";

describe("Incidents (e2e)", () => {
  let app: INestApplication;
  let server: any;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it("lists only incidents belonging to the current user's monitors", async () => {
    const ownerReg = await request(server)
      .post("/api/v1/auth/register")
      .send({ email: "incidentowner@test.local", username: "incidentowner", password: "SuperSecret123" })
      .expect(201);
    const otherReg = await request(server)
      .post("/api/v1/auth/register")
      .send({ email: "incidentother@test.local", username: "incidentother", password: "SuperSecret123" })
      .expect(201);

    const monitor = await request(server)
      .post("/api/v1/monitors")
      .set("Authorization", `Bearer ${ownerReg.body.tokens.accessToken}`)
      .send({ name: "Flaky Service", type: "HTTP", target: "https://flaky.example.com" })
      .expect(201);

    // Incidents are created by the worker; simulate that here directly via Prisma.
    await prisma.incident.create({
      data: { monitorId: monitor.body.id, status: "ONGOING", message: "Connection refused" },
    });

    const ownerList = await request(server)
      .get("/api/v1/incidents")
      .set("Authorization", `Bearer ${ownerReg.body.tokens.accessToken}`)
      .expect(200);
    expect(ownerList.body.data).toHaveLength(1);

    const otherList = await request(server)
      .get("/api/v1/incidents")
      .set("Authorization", `Bearer ${otherReg.body.tokens.accessToken}`)
      .expect(200);
    expect(otherList.body.data).toHaveLength(0);

    const incidentId = ownerList.body.data[0].id;
    await request(server)
      .get(`/api/v1/incidents/${incidentId}`)
      .set("Authorization", `Bearer ${otherReg.body.tokens.accessToken}`)
      .expect(404);
  });
});
