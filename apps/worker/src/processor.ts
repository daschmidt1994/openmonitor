import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import type { PrismaClient } from "@openmonitor/database";
import { runMonitorCheck } from "./engine/run-check";
import { logger } from "./logger";
import { CHECK_QUEUE_NAME } from "./constants";

export interface CheckJobData {
  monitorId: string;
}

/**
 * A single slow monitor cannot block the others: BullMQ dispatches jobs to
 * up to `concurrency` parallel in-process workers, and a per-job timeout is
 * enforced implicitly by each checker's own `monitor.timeout`. If the
 * process crashes mid-job, BullMQ's Redis-backed queue keeps the job so it
 * is retried by the next worker instance that starts up.
 */
export function createCheckWorker(
  prisma: PrismaClient,
  redisUrl: string,
  concurrency: number,
  publicBaseUrl?: string
): Worker<CheckJobData> {
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

  const worker = new Worker<CheckJobData>(
    CHECK_QUEUE_NAME,
    async (job: Job<CheckJobData>) => {
      await runMonitorCheck(prisma, job.data.monitorId, { publicBaseUrl });
    },
    { connection, concurrency, autorun: true }
  );

  worker.on("failed", (job, err) => {
    logger.error("Check job failed", { monitorId: job?.data.monitorId, error: err.message });
  });
  worker.on("error", (err) => {
    logger.error("Worker connection error", { error: err.message });
  });

  return worker;
}
