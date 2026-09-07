import type { PrismaClient } from "@openmonitor/database";
import type { Queue } from "bullmq";
import { logger } from "./logger";

const BATCH_SIZE = 200;

/**
 * Polls the database for monitors whose nextCheckAt has passed and enqueues
 * a check job for each. Due monitors are immediately "claimed" (their
 * nextCheckAt is bumped forward) so a slow-draining queue can't cause the
 * same monitor to be enqueued twice before its first job even runs -- the
 * authoritative nextCheckAt is then set again once the check actually
 * completes (see engine/run-check.ts), which is what makes retries schedule
 * sooner than the normal interval.
 */
export async function pollAndEnqueueDueMonitors(prisma: PrismaClient, queue: Queue, now: Date = new Date()): Promise<number> {
  const due = await prisma.monitor.findMany({
    where: {
      active: true,
      OR: [{ nextCheckAt: null }, { nextCheckAt: { lte: now } }],
    },
    take: BATCH_SIZE,
    select: { id: true, interval: true },
  });

  if (due.length === 0) return 0;

  await prisma.$transaction(
    due.map((m) =>
      prisma.monitor.update({
        where: { id: m.id },
        data: { nextCheckAt: new Date(now.getTime() + m.interval * 1000) },
      })
    )
  );

  await Promise.all(
    due.map((m) =>
      queue.add(
        "check",
        { monitorId: m.id },
        {
          jobId: `${m.id}-${now.getTime()}`,
          removeOnComplete: 1000,
          removeOnFail: 1000,
        }
      )
    )
  );

  logger.debug("Enqueued due monitor checks", { count: due.length });
  return due.length;
}

export function startScheduler(prisma: PrismaClient, queue: Queue, pollIntervalMs: number): NodeJS.Timeout {
  return setInterval(() => {
    pollAndEnqueueDueMonitors(prisma, queue).catch((err) => {
      logger.error("Scheduler poll failed", { error: err instanceof Error ? err.message : String(err) });
    });
  }, pollIntervalMs);
}
