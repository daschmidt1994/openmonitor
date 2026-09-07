import type { PrismaClient } from "@openmonitor/database";
import { logger } from "./logger";

/**
 * Deletes MonitorCheck rows older than the retention window. This is the
 * highest-growth table in the schema (one row per check per interval), so
 * pruning keeps both storage and the (monitorId, checkedAt) index bounded.
 * The retention window is configurable via the `check_retention_days`
 * SystemSetting (set through the admin API) and falls back to
 * CHECK_RETENTION_DAYS.
 */
export async function pruneOldChecks(prisma: PrismaClient, retentionDays: number, now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await prisma.monitorCheck.deleteMany({ where: { checkedAt: { lt: cutoff } } });
  if (result.count > 0) {
    logger.info("Pruned old monitor checks", { deleted: result.count, cutoff: cutoff.toISOString() });
  }
  return result.count;
}

export async function resolveRetentionDays(prisma: PrismaClient, envDefault: number): Promise<number> {
  const row = await prisma.systemSetting.findUnique({ where: { key: "check_retention_days" } });
  if (row && typeof row.value === "number") return row.value;
  return envDefault;
}

export function startRetentionSweep(prisma: PrismaClient, envDefaultDays: number, intervalMs: number): NodeJS.Timeout {
  const run = async () => {
    try {
      const days = await resolveRetentionDays(prisma, envDefaultDays);
      await pruneOldChecks(prisma, days);
    } catch (err) {
      logger.error("Retention sweep failed", { error: err instanceof Error ? err.message : String(err) });
    }
  };
  void run();
  return setInterval(run, intervalMs);
}
