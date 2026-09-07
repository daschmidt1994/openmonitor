import { Queue } from "bullmq";
import IORedis from "ioredis";
import { getPrismaClient } from "@openmonitor/database";
import { loadEnv } from "./env";
import { logger } from "./logger";
import { startScheduler, pollAndEnqueueDueMonitors } from "./scheduler";
import { createCheckWorker } from "./processor";
import { startRetentionSweep } from "./retention";
import { CHECK_QUEUE_NAME } from "./constants";

async function main() {
  const env = loadEnv();
  const prisma = getPrismaClient();
  await prisma.$connect();

  const queueConnection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  const queue = new Queue(CHECK_QUEUE_NAME, { connection: queueConnection });

  const checkWorker = createCheckWorker(prisma, env.REDIS_URL, env.CHECK_CONCURRENCY, env.PUBLIC_BASE_URL);

  // Run an immediate pass on boot so monitors that were due while the worker
  // was down (e.g. after a restart or deploy) get checked right away,
  // instead of waiting for the next poll tick.
  await pollAndEnqueueDueMonitors(prisma, queue);
  const schedulerTimer = startScheduler(prisma, queue, env.SCHEDULER_POLL_INTERVAL_MS);
  const retentionTimer = startRetentionSweep(prisma, env.CHECK_RETENTION_DAYS, env.RETENTION_SWEEP_INTERVAL_MS);

  logger.info("Worker started", {
    concurrency: env.CHECK_CONCURRENCY,
    pollIntervalMs: env.SCHEDULER_POLL_INTERVAL_MS,
  });

  const shutdown = async (signal: string) => {
    logger.info("Shutting down", { signal });
    clearInterval(schedulerTimer);
    clearInterval(retentionTimer);
    await checkWorker.close();
    await queue.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error("Worker failed to start", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
