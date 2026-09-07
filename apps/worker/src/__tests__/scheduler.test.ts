import "./test-env";
import { PrismaClient } from "@openmonitor/database";
import { MonitorType } from "@openmonitor/shared";
import { pollAndEnqueueDueMonitors } from "../scheduler";

const prisma = new PrismaClient();

class FakeQueue {
  added: Array<{ name: string; data: unknown }> = [];
  async add(name: string, data: unknown) {
    this.added.push({ name, data });
  }
}

beforeEach(async () => {
  await prisma.$transaction([prisma.monitorCheck.deleteMany(), prisma.monitor.deleteMany(), prisma.user.deleteMany()]);
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function makeUser() {
  return prisma.user.create({
    data: { email: `${Math.random()}@test.local`, username: `u${Math.random().toString(36).slice(2, 10)}`, passwordHash: "x" },
  });
}

describe("pollAndEnqueueDueMonitors", () => {
  it("enqueues monitors that are due and claims them by bumping nextCheckAt", async () => {
    const user = await makeUser();
    const now = new Date();
    const due = await prisma.monitor.create({
      data: { userId: user.id, name: "Due", type: MonitorType.TCP, target: "example.com", port: 80, interval: 30, nextCheckAt: new Date(now.getTime() - 1000) },
    });
    await prisma.monitor.create({
      data: { userId: user.id, name: "NotDue", type: MonitorType.TCP, target: "example.com", port: 80, interval: 30, nextCheckAt: new Date(now.getTime() + 60_000) },
    });
    await prisma.monitor.create({
      data: { userId: user.id, name: "Paused", type: MonitorType.TCP, target: "example.com", port: 80, interval: 30, active: false, nextCheckAt: new Date(now.getTime() - 1000) },
    });

    const queue = new FakeQueue();
    const count = await pollAndEnqueueDueMonitors(prisma, queue as any, now);

    expect(count).toBe(1);
    expect(queue.added).toHaveLength(1);
    expect((queue.added[0].data as any).monitorId).toBe(due.id);

    const updated = await prisma.monitor.findUniqueOrThrow({ where: { id: due.id } });
    expect(updated.nextCheckAt!.getTime()).toBeGreaterThan(now.getTime());
  });

  it("enqueues a monitor that has never been checked (nextCheckAt is null)", async () => {
    const user = await makeUser();
    const monitor = await prisma.monitor.create({
      data: { userId: user.id, name: "Fresh", type: MonitorType.TCP, target: "example.com", port: 80 },
    });

    const queue = new FakeQueue();
    const count = await pollAndEnqueueDueMonitors(prisma, queue as any);

    expect(count).toBe(1);
    expect((queue.added[0].data as any).monitorId).toBe(monitor.id);
  });

  it("does nothing when no monitors are due", async () => {
    const queue = new FakeQueue();
    const count = await pollAndEnqueueDueMonitors(prisma, queue as any);
    expect(count).toBe(0);
    expect(queue.added).toHaveLength(0);
  });
});
