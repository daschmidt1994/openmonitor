import "./test-env";
import { PrismaClient } from "@openmonitor/database";
import { CheckStatus, MonitorType } from "@openmonitor/shared";
import { pruneOldChecks } from "../retention";

const prisma = new PrismaClient();

beforeEach(async () => {
  await prisma.$transaction([prisma.monitorCheck.deleteMany(), prisma.monitor.deleteMany(), prisma.user.deleteMany()]);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("pruneOldChecks", () => {
  it("deletes checks older than the retention window and keeps recent ones", async () => {
    const user = await prisma.user.create({
      data: { email: "retention@test.local", username: "retentionuser", passwordHash: "x" },
    });
    const monitor = await prisma.monitor.create({
      data: { userId: user.id, name: "M", type: MonitorType.TCP, target: "example.com", port: 80 },
    });

    const now = new Date();
    await prisma.monitorCheck.create({
      data: { monitorId: monitor.id, status: CheckStatus.UP, checkedAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000) },
    });
    await prisma.monitorCheck.create({
      data: { monitorId: monitor.id, status: CheckStatus.UP, checkedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
    });

    const deleted = await pruneOldChecks(prisma, 90, now);
    expect(deleted).toBe(1);

    const remaining = await prisma.monitorCheck.count({ where: { monitorId: monitor.id } });
    expect(remaining).toBe(1);
  });
});
