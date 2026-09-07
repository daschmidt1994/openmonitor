import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@openmonitor/database";
import { CheckStatus, Role } from "@openmonitor/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuditLogService } from "../../common/audit/audit-log.service";
import { buildPaginatedResult } from "../../common/pagination/paginate";
import type { AuthenticatedUser } from "../../common/guards/auth.guard";
import type { CreateMonitorDto } from "./dto/create-monitor.dto";
import type { UpdateMonitorDto } from "./dto/update-monitor.dto";
import type { ListMonitorsQueryDto } from "./dto/list-monitors-query.dto";

const monitorInclude = { tags: { include: { tag: true } } } satisfies Prisma.MonitorInclude;

@Injectable()
export class MonitorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService
  ) {}

  async create(user: AuthenticatedUser, dto: CreateMonitorDto) {
    const { tagIds, ...data } = dto;
    const monitor = await this.prisma.monitor.create({
      data: {
        ...data,
        userId: user.id,
        nextCheckAt: new Date(),
        ...(tagIds && tagIds.length > 0
          ? { tags: { create: await this.ownedTagIds(user.id, tagIds).then((ids) => ids.map((tagId) => ({ tagId }))) } }
          : {}),
      },
      include: monitorInclude,
    });

    await this.auditLog.record({ userId: user.id, action: "monitor.create", targetType: "Monitor", targetId: monitor.id });
    return monitor;
  }

  async findAll(user: AuthenticatedUser, query: ListMonitorsQueryDto) {
    const { page, pageSize, sortBy, sortOrder, type, status, active, tags, search, all } = query;

    const where: Prisma.MonitorWhereInput = {};
    if (!(all && user.role === Role.ADMIN)) {
      where.userId = user.id;
    }
    if (type) where.type = type;
    if (status) where.currentStatus = status;
    if (active !== undefined) where.active = active;
    if (search) where.name = { contains: search, mode: "insensitive" };
    if (tags) {
      const tagNames = tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (tagNames.length > 0) {
        where.tags = { some: { tag: { name: { in: tagNames } } } };
      }
    }

    const orderableFields = new Set(["createdAt", "name", "currentStatus", "lastCheckAt"]);
    const orderBy = sortBy && orderableFields.has(sortBy) ? { [sortBy]: sortOrder } : { createdAt: sortOrder as "asc" | "desc" };

    const [monitors, total] = await this.prisma.$transaction([
      this.prisma.monitor.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize, include: monitorInclude }),
      this.prisma.monitor.count({ where }),
    ]);

    return buildPaginatedResult(monitors, total, page, pageSize);
  }

  async findOneOwned(user: AuthenticatedUser, id: string) {
    const monitor = await this.prisma.monitor.findUnique({ where: { id }, include: monitorInclude });
    if (!monitor || (monitor.userId !== user.id && user.role !== Role.ADMIN)) {
      throw new NotFoundException("Monitor not found");
    }
    return monitor;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateMonitorDto) {
    const existing = await this.findOneOwned(user, id);
    const { tagIds, ...data } = dto;

    const monitor = await this.prisma.monitor.update({
      where: { id: existing.id },
      data: {
        ...data,
        ...(tagIds !== undefined
          ? {
              tags: {
                deleteMany: {},
                create: (await this.ownedTagIds(existing.userId, tagIds)).map((tagId) => ({ tagId })),
              },
            }
          : {}),
      },
      include: monitorInclude,
    });

    await this.auditLog.record({ userId: user.id, action: "monitor.update", targetType: "Monitor", targetId: id });
    return monitor;
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    const existing = await this.findOneOwned(user, id);
    await this.prisma.monitor.delete({ where: { id: existing.id } });
    await this.auditLog.record({ userId: user.id, action: "monitor.delete", targetType: "Monitor", targetId: id });
  }

  async stats(user: AuthenticatedUser) {
    const where: Prisma.MonitorWhereInput = user.role === Role.ADMIN ? {} : { userId: user.id };

    const [total, up, down, paused, avgResponse, ongoingIncidents] = await this.prisma.$transaction([
      this.prisma.monitor.count({ where }),
      this.prisma.monitor.count({ where: { ...where, currentStatus: CheckStatus.UP, active: true } }),
      this.prisma.monitor.count({ where: { ...where, currentStatus: CheckStatus.DOWN, active: true } }),
      this.prisma.monitor.count({ where: { ...where, active: false } }),
      this.prisma.monitorCheck.aggregate({
        where: { monitor: where, checkedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        _avg: { responseTime: true },
      }),
      this.prisma.incident.count({ where: { status: "ONGOING", monitor: where } }),
    ]);

    return {
      totalMonitors: total,
      up,
      down,
      paused,
      averageResponseTimeMs: avgResponse._avg.responseTime ? Math.round(avgResponse._avg.responseTime) : null,
      ongoingIncidents,
    };
  }

  private async ownedTagIds(userId: string, tagIds: string[]): Promise<string[]> {
    if (tagIds.length === 0) return [];
    const owned = await this.prisma.tag.findMany({ where: { id: { in: tagIds }, userId }, select: { id: true } });
    return owned.map((t) => t.id);
  }
}
