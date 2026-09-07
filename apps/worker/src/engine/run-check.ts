import type { PrismaClient } from "@openmonitor/database";
import { getChecker, type CheckableMonitor } from "@openmonitor/monitoring-engine";
import { sendNotification } from "@openmonitor/notifications";
import { CheckStatus, IncidentStatus, MonitorType, NotificationType } from "@openmonitor/shared";
import { logger } from "../logger";

export interface RunCheckOptions {
  now?: Date;
  publicBaseUrl?: string;
}

function invertIfUpsideDown(status: CheckStatus, upsideDown: boolean): CheckStatus {
  if (!upsideDown) return status;
  if (status === CheckStatus.UP) return CheckStatus.DOWN;
  if (status === CheckStatus.DOWN) return CheckStatus.UP;
  return status;
}

/**
 * Executes a single monitor check end-to-end: run the appropriate checker,
 * persist the raw result, apply the retry/confirmation window to decide
 * whether the monitor's *confirmed* status actually changes, and -- only on
 * a confirmed transition -- open/close an Incident and fire notifications.
 *
 * This is the one place flapping is guarded against: a single failed check
 * never immediately flips a healthy monitor to DOWN or opens an incident;
 * it must fail `monitor.retries + 1` consecutive times first.
 */
export async function runMonitorCheck(prisma: PrismaClient, monitorId: string, options: RunCheckOptions = {}): Promise<void> {
  const now = options.now ?? new Date();

  const monitor = await prisma.monitor.findUnique({
    where: { id: monitorId },
    include: { notifications: { include: { provider: true } } },
  });
  if (!monitor || !monitor.active) return;

  const checker = getChecker(monitor.type as unknown as MonitorType);
  const rawResult = await checker.check(monitor as unknown as CheckableMonitor);
  const status = invertIfUpsideDown(rawResult.status, monitor.upsideDown);

  await prisma.monitorCheck.create({
    data: {
      monitorId: monitor.id,
      status,
      responseTime: rawResult.responseTime,
      statusCode: rawResult.statusCode,
      message: rawResult.message,
      certExpiresAt: rawResult.certExpiresAt,
      certDaysRemaining: rawResult.certDaysRemaining,
      checkedAt: now,
    },
  });

  let newConsecutiveFailures = monitor.consecutiveFailures;
  let newCurrentStatus: CheckStatus = monitor.currentStatus as CheckStatus;
  let nextCheckDelaySeconds = monitor.interval;

  if (status === CheckStatus.DOWN) {
    newConsecutiveFailures = monitor.consecutiveFailures + 1;
    if (newConsecutiveFailures > monitor.retries) {
      newCurrentStatus = CheckStatus.DOWN;
      nextCheckDelaySeconds = monitor.interval;
    } else {
      // Still within the confirmation window: keep the previous confirmed
      // status and re-check sooner (retryInterval) instead of waiting a
      // full interval.
      nextCheckDelaySeconds = monitor.retryInterval;
    }
  } else {
    newConsecutiveFailures = 0;
    newCurrentStatus = CheckStatus.UP;
    nextCheckDelaySeconds = monitor.interval;
  }

  const wasDown = monitor.currentStatus === CheckStatus.DOWN;
  const isDown = newCurrentStatus === CheckStatus.DOWN;
  const isUp = newCurrentStatus === CheckStatus.UP;

  if (!wasDown && isDown) {
    await handleDownTransition(prisma, monitor, rawResult.message, now, options.publicBaseUrl);
  } else if (wasDown && isUp) {
    await handleRecoveryTransition(prisma, monitor, now, options.publicBaseUrl);
  } else if (wasDown && isDown) {
    await handleStillDownResend(prisma, monitor, rawResult.message, now, options.publicBaseUrl);
  }

  await prisma.monitor.update({
    where: { id: monitor.id },
    data: {
      currentStatus: newCurrentStatus,
      consecutiveFailures: newConsecutiveFailures,
      lastCheckAt: now,
      nextCheckAt: new Date(now.getTime() + nextCheckDelaySeconds * 1000),
    },
  });
}

type MonitorWithNotifications = Awaited<ReturnType<PrismaClient["monitor"]["findUniqueOrThrow"]>> & {
  notifications: Array<{
    providerId: string;
    monitorId: string;
    notifyOnDown: boolean;
    notifyOnRecovery: boolean;
    resendIntervalMinutes: number;
    lastNotifiedAt: Date | null;
    provider: { id: string; type: string; config: unknown; active: boolean };
  }>;
};

async function handleDownTransition(
  prisma: PrismaClient,
  monitor: MonitorWithNotifications,
  message: string | null,
  now: Date,
  publicBaseUrl?: string
) {
  await prisma.incident.create({
    data: { monitorId: monitor.id, status: IncidentStatus.ONGOING, startedAt: now, message },
  });
  logger.info("Monitor transitioned to DOWN, incident opened", { monitorId: monitor.id, message });

  await dispatchToProviders(prisma, monitor, "DOWN", message, now, publicBaseUrl, (n) => n.notifyOnDown);
}

async function handleRecoveryTransition(prisma: PrismaClient, monitor: MonitorWithNotifications, now: Date, publicBaseUrl?: string) {
  const ongoing = await prisma.incident.findFirst({
    where: { monitorId: monitor.id, status: IncidentStatus.ONGOING },
    orderBy: { startedAt: "desc" },
  });

  let downtimeMs: number | undefined;
  if (ongoing) {
    downtimeMs = now.getTime() - ongoing.startedAt.getTime();
    await prisma.incident.update({
      where: { id: ongoing.id },
      data: { status: IncidentStatus.RESOLVED, resolvedAt: now },
    });
  }
  logger.info("Monitor recovered, incident resolved", { monitorId: monitor.id, downtimeMs });

  await dispatchToProviders(prisma, monitor, "RECOVERY", null, now, publicBaseUrl, (n) => n.notifyOnRecovery, downtimeMs);
}

async function handleStillDownResend(
  prisma: PrismaClient,
  monitor: MonitorWithNotifications,
  message: string | null,
  now: Date,
  publicBaseUrl?: string
) {
  await dispatchToProviders(
    prisma,
    monitor,
    "DOWN",
    message,
    now,
    publicBaseUrl,
    (n) => n.notifyOnDown && n.resendIntervalMinutes > 0 && dueForResend(n.lastNotifiedAt, n.resendIntervalMinutes, now)
  );
}

function dueForResend(lastNotifiedAt: Date | null, resendIntervalMinutes: number, now: Date): boolean {
  if (!lastNotifiedAt) return true;
  return now.getTime() - lastNotifiedAt.getTime() >= resendIntervalMinutes * 60_000;
}

async function dispatchToProviders(
  prisma: PrismaClient,
  monitor: MonitorWithNotifications,
  eventType: "DOWN" | "RECOVERY",
  message: string | null,
  now: Date,
  publicBaseUrl: string | undefined,
  shouldNotify: (n: MonitorWithNotifications["notifications"][number]) => boolean,
  downtimeDurationMs?: number
) {
  for (const link of monitor.notifications) {
    if (!link.provider.active || !shouldNotify(link)) continue;

    const result = await sendNotification(link.provider.type as NotificationType, link.provider.config, {
      eventType,
      monitorName: monitor.name,
      monitorTarget: monitor.target,
      message,
      occurredAt: now,
      downtimeDurationMs,
      monitorUrl: publicBaseUrl ? `${publicBaseUrl}/monitors/${monitor.id}` : undefined,
    });

    if (!result.success) {
      logger.warn("Notification dispatch failed", { monitorId: monitor.id, providerId: link.providerId, error: result.error });
    }

    await prisma.monitorNotification.update({
      where: { monitorId_providerId: { monitorId: monitor.id, providerId: link.providerId } },
      data: { lastNotifiedAt: now },
    });
  }
}
