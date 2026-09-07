import { CheckStatus } from "@openmonitor/shared";

export interface UptimeCheckPoint {
  status: CheckStatus;
  checkedAt: Date;
}

export interface UptimeStats {
  uptimePercentage: number;
  totalChecks: number;
  upChecks: number;
  downChecks: number;
  totalDowntimeMs: number;
}

/**
 * Time-weighted uptime calculation: the duration between two consecutive
 * checks is attributed to the status of the *earlier* check (i.e. "the
 * service was in this state for this long until we checked again"). This is
 * more accurate than a naive UP-count/total-count ratio when check intervals
 * vary or checks are missing (e.g. after a worker restart).
 */
export function calculateUptimeStats(points: UptimeCheckPoint[]): UptimeStats {
  if (points.length === 0) {
    return { uptimePercentage: 100, totalChecks: 0, upChecks: 0, downChecks: 0, totalDowntimeMs: 0 };
  }

  const sorted = [...points].sort((a, b) => a.checkedAt.getTime() - b.checkedAt.getTime());

  let upChecks = 0;
  let downChecks = 0;
  for (const p of sorted) {
    if (p.status === CheckStatus.UP) upChecks++;
    else if (p.status === CheckStatus.DOWN) downChecks++;
  }

  let upDurationMs = 0;
  let downDurationMs = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const durationMs = sorted[i + 1].checkedAt.getTime() - sorted[i].checkedAt.getTime();
    if (sorted[i].status === CheckStatus.UP) upDurationMs += durationMs;
    else if (sorted[i].status === CheckStatus.DOWN) downDurationMs += durationMs;
  }

  const totalDurationMs = upDurationMs + downDurationMs;
  const uptimePercentage =
    totalDurationMs === 0 ? (downChecks === 0 ? 100 : 0) : (upDurationMs / totalDurationMs) * 100;

  return {
    uptimePercentage: Math.round(uptimePercentage * 100) / 100,
    totalChecks: sorted.length,
    upChecks,
    downChecks,
    totalDowntimeMs: downDurationMs,
  };
}
