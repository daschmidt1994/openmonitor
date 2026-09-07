import "./test-env";
import * as http from "node:http";
import type { AddressInfo } from "node:net";
import { Prisma, PrismaClient } from "@openmonitor/database";
import { CheckStatus, IncidentStatus, MonitorType, NotificationType } from "@openmonitor/shared";
import { runMonitorCheck } from "../engine/run-check";

const prisma = new PrismaClient();

let targetShouldSucceed = true;
let targetServer: http.Server;
let targetUrl: string;

let webhookHits: any[] = [];
let webhookServer: http.Server;
let webhookUrl: string;

beforeAll(async () => {
  targetServer = http.createServer((_req, res) => {
    if (targetShouldSucceed) {
      res.writeHead(200);
      res.end("ok");
    } else {
      res.writeHead(500);
      res.end("fail");
    }
  });
  await new Promise<void>((resolve) => targetServer.listen(0, "127.0.0.1", resolve));
  targetUrl = `http://127.0.0.1:${(targetServer.address() as AddressInfo).port}`;

  webhookServer = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      webhookHits.push(JSON.parse(Buffer.concat(chunks).toString("utf-8")));
      res.writeHead(200);
      res.end("{}");
    });
  });
  await new Promise<void>((resolve) => webhookServer.listen(0, "127.0.0.1", resolve));
  webhookUrl = `http://127.0.0.1:${(webhookServer.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => targetServer.close(() => resolve()));
  await new Promise<void>((resolve) => webhookServer.close(() => resolve()));
  await prisma.$disconnect();
});

beforeEach(async () => {
  targetShouldSucceed = true;
  webhookHits = [];
  await prisma.$transaction([
    prisma.monitorNotification.deleteMany(),
    prisma.notificationProvider.deleteMany(),
    prisma.incident.deleteMany(),
    prisma.monitorCheck.deleteMany(),
    prisma.monitor.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

async function createUserAndMonitor(overrides: Partial<Prisma.MonitorUncheckedCreateInput> = {}) {
  const user = await prisma.user.create({
    data: { email: `${Math.random()}@test.local`, username: `u${Math.random().toString(36).slice(2, 10)}`, passwordHash: "x" },
  });
  const monitor = await prisma.monitor.create({
    data: {
      userId: user.id,
      name: "Test Monitor",
      type: MonitorType.HTTP,
      target: targetUrl,
      interval: 60,
      timeout: 5,
      retries: 2,
      retryInterval: 1,
      currentStatus: CheckStatus.PENDING,
      ...overrides,
    },
  });
  return { user, monitor };
}

describe("runMonitorCheck - retry/confirmation (anti-flapping)", () => {
  it("marks the monitor UP on the very first successful check", async () => {
    const { monitor } = await createUserAndMonitor();
    await runMonitorCheck(prisma, monitor.id);

    const updated = await prisma.monitor.findUniqueOrThrow({ where: { id: monitor.id } });
    expect(updated.currentStatus).toBe(CheckStatus.UP);
    expect(updated.consecutiveFailures).toBe(0);

    const incidents = await prisma.incident.count({ where: { monitorId: monitor.id } });
    expect(incidents).toBe(0);
  });

  it("does NOT flip to DOWN or open an incident on a single failed check when retries > 0", async () => {
    const { monitor } = await createUserAndMonitor({ currentStatus: CheckStatus.UP, retries: 2 });
    targetShouldSucceed = false;

    await runMonitorCheck(prisma, monitor.id);

    const updated = await prisma.monitor.findUniqueOrThrow({ where: { id: monitor.id } });
    expect(updated.currentStatus).toBe(CheckStatus.UP); // still UP: within confirmation window
    expect(updated.consecutiveFailures).toBe(1);

    const incidents = await prisma.incident.count({ where: { monitorId: monitor.id } });
    expect(incidents).toBe(0);

    // The raw check result was still recorded as DOWN in history.
    const checks = await prisma.monitorCheck.findMany({ where: { monitorId: monitor.id } });
    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe(CheckStatus.DOWN);
  });

  it("transitions to DOWN and opens exactly one incident once failures exceed `retries`", async () => {
    const { monitor } = await createUserAndMonitor({ currentStatus: CheckStatus.UP, retries: 2 });
    targetShouldSucceed = false;

    await runMonitorCheck(prisma, monitor.id); // failure 1/3 -> still UP
    await runMonitorCheck(prisma, monitor.id); // failure 2/3 -> still UP
    await runMonitorCheck(prisma, monitor.id); // failure 3/3 -> confirmed DOWN

    const updated = await prisma.monitor.findUniqueOrThrow({ where: { id: monitor.id } });
    expect(updated.currentStatus).toBe(CheckStatus.DOWN);
    expect(updated.consecutiveFailures).toBe(3);

    const incidents = await prisma.incident.findMany({ where: { monitorId: monitor.id } });
    expect(incidents).toHaveLength(1);
    expect(incidents[0].status).toBe(IncidentStatus.ONGOING);
  });

  it("resolves the incident and returns to UP on recovery", async () => {
    const { monitor } = await createUserAndMonitor({ currentStatus: CheckStatus.UP, retries: 1 });
    targetShouldSucceed = false;
    await runMonitorCheck(prisma, monitor.id);
    await runMonitorCheck(prisma, monitor.id); // now confirmed DOWN, incident opened

    let updated = await prisma.monitor.findUniqueOrThrow({ where: { id: monitor.id } });
    expect(updated.currentStatus).toBe(CheckStatus.DOWN);

    targetShouldSucceed = true;
    await runMonitorCheck(prisma, monitor.id);

    updated = await prisma.monitor.findUniqueOrThrow({ where: { id: monitor.id } });
    expect(updated.currentStatus).toBe(CheckStatus.UP);
    expect(updated.consecutiveFailures).toBe(0);

    const incidents = await prisma.incident.findMany({ where: { monitorId: monitor.id } });
    expect(incidents).toHaveLength(1);
    expect(incidents[0].status).toBe(IncidentStatus.RESOLVED);
    expect(incidents[0].resolvedAt).not.toBeNull();
  });

  it("respects upsideDown mode (treats a normally-DOWN result as UP)", async () => {
    const { monitor } = await createUserAndMonitor({ currentStatus: CheckStatus.UP, retries: 0, upsideDown: true });
    targetShouldSucceed = false; // raw result is DOWN, but upsideDown inverts it to UP

    await runMonitorCheck(prisma, monitor.id);

    const updated = await prisma.monitor.findUniqueOrThrow({ where: { id: monitor.id } });
    expect(updated.currentStatus).toBe(CheckStatus.UP);
    const incidents = await prisma.incident.count({ where: { monitorId: monitor.id } });
    expect(incidents).toBe(0);
  });
});

describe("runMonitorCheck - notification dispatch", () => {
  it("notifies linked providers on DOWN and on RECOVERY, respecting notifyOnDown/notifyOnRecovery", async () => {
    const { monitor } = await createUserAndMonitor({ currentStatus: CheckStatus.UP, retries: 0 });
    const provider = await prisma.notificationProvider.create({
      data: { userId: monitor.userId, name: "Webhook", type: NotificationType.WEBHOOK, config: { url: webhookUrl } },
    });
    await prisma.monitorNotification.create({
      data: { monitorId: monitor.id, providerId: provider.id, notifyOnDown: true, notifyOnRecovery: true, resendIntervalMinutes: 0 },
    });

    targetShouldSucceed = false;
    await runMonitorCheck(prisma, monitor.id); // confirmed DOWN immediately (retries: 0)
    expect(webhookHits).toHaveLength(1);
    expect(webhookHits[0].event).toBe("DOWN");

    targetShouldSucceed = true;
    await runMonitorCheck(prisma, monitor.id); // recovery
    expect(webhookHits).toHaveLength(2);
    expect(webhookHits[1].event).toBe("RECOVERY");
  });

  it("does not resend DOWN notifications before resendIntervalMinutes has elapsed, but does after", async () => {
    const { monitor } = await createUserAndMonitor({ currentStatus: CheckStatus.UP, retries: 0 });
    const provider = await prisma.notificationProvider.create({
      data: { userId: monitor.userId, name: "Webhook", type: NotificationType.WEBHOOK, config: { url: webhookUrl } },
    });
    await prisma.monitorNotification.create({
      data: { monitorId: monitor.id, providerId: provider.id, notifyOnDown: true, notifyOnRecovery: true, resendIntervalMinutes: 10 },
    });

    targetShouldSucceed = false;
    const t0 = new Date();
    await runMonitorCheck(prisma, monitor.id, { now: t0 }); // initial DOWN notification
    expect(webhookHits).toHaveLength(1);

    // Still down, only 1 minute later: must NOT resend yet.
    await runMonitorCheck(prisma, monitor.id, { now: new Date(t0.getTime() + 60_000) });
    expect(webhookHits).toHaveLength(1);

    // Still down, 11 minutes later: resend is due.
    await runMonitorCheck(prisma, monitor.id, { now: new Date(t0.getTime() + 11 * 60_000) });
    expect(webhookHits).toHaveLength(2);
  });

  it("skips a disabled notification provider", async () => {
    const { monitor } = await createUserAndMonitor({ currentStatus: CheckStatus.UP, retries: 0 });
    const provider = await prisma.notificationProvider.create({
      data: { userId: monitor.userId, name: "Webhook", type: NotificationType.WEBHOOK, config: { url: webhookUrl }, active: false },
    });
    await prisma.monitorNotification.create({ data: { monitorId: monitor.id, providerId: provider.id } });

    targetShouldSucceed = false;
    await runMonitorCheck(prisma, monitor.id);
    expect(webhookHits).toHaveLength(0);
  });
});
