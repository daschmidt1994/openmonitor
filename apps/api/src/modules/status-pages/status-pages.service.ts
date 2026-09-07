import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Role } from "@openmonitor/shared";
import { calculateUptimeStats } from "@openmonitor/monitoring-engine";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuditLogService } from "../../common/audit/audit-log.service";
import type { AuthenticatedUser } from "../../common/guards/auth.guard";
import type { CreateStatusPageDto } from "./dto/create-status-page.dto";
import type { UpdateStatusPageDto } from "./dto/update-status-page.dto";
import type { AddMonitorToStatusPageDto } from "./dto/add-monitor.dto";

const UPTIME_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class StatusPagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService
  ) {}

  async list(user: AuthenticatedUser) {
    return this.prisma.statusPage.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  }

  async create(user: AuthenticatedUser, dto: CreateStatusPageDto) {
    const clash = await this.prisma.statusPage.findUnique({ where: { slug: dto.slug } });
    if (clash) throw new ConflictException("This slug is already in use");
    const page = await this.prisma.statusPage.create({ data: { ...dto, userId: user.id } });
    await this.auditLog.record({ userId: user.id, action: "status_page.create", targetType: "StatusPage", targetId: page.id });
    return page;
  }

  async findOneOwned(user: AuthenticatedUser, id: string) {
    const page = await this.prisma.statusPage.findUnique({
      where: { id },
      include: { monitors: { include: { monitor: true }, orderBy: { order: "asc" } } },
    });
    if (!page || (page.userId !== user.id && user.role !== Role.ADMIN)) {
      throw new NotFoundException("Status page not found");
    }
    return page;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateStatusPageDto) {
    const existing = await this.findOneOwned(user, id);
    const page = await this.prisma.statusPage.update({ where: { id: existing.id }, data: dto });
    await this.auditLog.record({ userId: user.id, action: "status_page.update", targetType: "StatusPage", targetId: id });
    return page;
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    const existing = await this.findOneOwned(user, id);
    await this.prisma.statusPage.delete({ where: { id: existing.id } });
    await this.auditLog.record({ userId: user.id, action: "status_page.delete", targetType: "StatusPage", targetId: id });
  }

  async addMonitor(user: AuthenticatedUser, statusPageId: string, monitorId: string, dto: AddMonitorToStatusPageDto) {
    const page = await this.findOneOwned(user, statusPageId);
    const monitor = await this.prisma.monitor.findUnique({ where: { id: monitorId } });
    if (!monitor || (monitor.userId !== user.id && user.role !== Role.ADMIN)) {
      throw new NotFoundException("Monitor not found");
    }
    return this.prisma.statusPageMonitor.upsert({
      where: { statusPageId_monitorId: { statusPageId: page.id, monitorId } },
      create: { statusPageId: page.id, monitorId, order: dto.order ?? 0, label: dto.label },
      update: { order: dto.order, label: dto.label },
    });
  }

  async removeMonitor(user: AuthenticatedUser, statusPageId: string, monitorId: string): Promise<void> {
    const page = await this.findOneOwned(user, statusPageId);
    await this.prisma.statusPageMonitor.deleteMany({ where: { statusPageId: page.id, monitorId } });
  }

  async getPublic(slug: string) {
    const page = await this.prisma.statusPage.findUnique({
      where: { slug },
      include: { monitors: { include: { monitor: true }, orderBy: { order: "asc" } } },
    });
    if (!page || !page.isPublic) {
      throw new NotFoundException("Status page not found");
    }

    const since = new Date(Date.now() - UPTIME_WINDOW_MS);

    const monitors = await Promise.all(
      page.monitors.map(async (spm) => {
        const [checks, incidents] = await Promise.all([
          this.prisma.monitorCheck.findMany({
            where: { monitorId: spm.monitorId, checkedAt: { gte: since } },
            orderBy: { checkedAt: "asc" },
          }),
          this.prisma.incident.findMany({
            where: { monitorId: spm.monitorId },
            orderBy: { startedAt: "desc" },
            take: 10,
          }),
        ]);

        const uptime = calculateUptimeStats(checks.map((c) => ({ status: c.status as any, checkedAt: c.checkedAt })));

        return {
          id: spm.monitor.id,
          name: spm.label ?? spm.monitor.name,
          type: spm.monitor.type,
          currentStatus: spm.monitor.currentStatus,
          order: spm.order,
          uptime24h: uptime.uptimePercentage,
          averageResponseTimeMs:
            checks.length > 0
              ? Math.round(checks.reduce((sum, c) => sum + (c.responseTime ?? 0), 0) / checks.length)
              : null,
          incidents,
        };
      })
    );

    return {
      name: page.name,
      description: page.description,
      logoUrl: page.logoUrl,
      customCss: page.customCss,
      monitors,
    };
  }
}
