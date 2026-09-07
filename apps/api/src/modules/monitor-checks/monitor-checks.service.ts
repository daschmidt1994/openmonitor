import { Injectable } from "@nestjs/common";
import { calculateUptimeStats } from "@openmonitor/monitoring-engine";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { AuthenticatedUser } from "../../common/guards/auth.guard";
import { MonitorsService } from "../monitors/monitors.service";
import { rangeToMs, type HistoryRange } from "./dto/history-query.dto";

function serializeCheck(check: {
  id: bigint;
  status: string;
  responseTime: number | null;
  statusCode: number | null;
  message: string | null;
  certExpiresAt: Date | null;
  certDaysRemaining: number | null;
  checkedAt: Date;
}) {
  return { ...check, id: check.id.toString() };
}

@Injectable()
export class MonitorChecksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly monitorsService: MonitorsService
  ) {}

  async getHistory(user: AuthenticatedUser, monitorId: string, range: HistoryRange) {
    const monitor = await this.monitorsService.findOneOwned(user, monitorId);
    const since = new Date(Date.now() - rangeToMs(range));

    const checks = await this.prisma.monitorCheck.findMany({
      where: { monitorId: monitor.id, checkedAt: { gte: since } },
      orderBy: { checkedAt: "asc" },
    });

    const uptime = calculateUptimeStats(checks.map((c) => ({ status: c.status as any, checkedAt: c.checkedAt })));

    return {
      monitorId: monitor.id,
      range,
      uptime,
      checks: checks.map(serializeCheck),
    };
  }
}
