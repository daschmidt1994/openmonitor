import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@openmonitor/database";
import { Role } from "@openmonitor/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { buildPaginatedResult } from "../../common/pagination/paginate";
import type { AuthenticatedUser } from "../../common/guards/auth.guard";
import type { ListIncidentsQueryDto } from "./dto/list-incidents-query.dto";

@Injectable()
export class IncidentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthenticatedUser, query: ListIncidentsQueryDto) {
    const { page, pageSize, monitorId, status } = query;

    const where: Prisma.IncidentWhereInput = {
      monitor: user.role === Role.ADMIN ? {} : { userId: user.id },
    };
    if (monitorId) where.monitorId = monitorId;
    if (status) where.status = status;

    const [incidents, total] = await this.prisma.$transaction([
      this.prisma.incident.findMany({
        where,
        orderBy: { startedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { monitor: { select: { id: true, name: true, type: true, target: true, userId: true } } },
      }),
      this.prisma.incident.count({ where }),
    ]);

    return buildPaginatedResult(incidents, total, page, pageSize);
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: { monitor: { select: { id: true, name: true, type: true, target: true, userId: true } } },
    });
    if (!incident || (incident.monitor.userId !== user.id && user.role !== Role.ADMIN)) {
      throw new NotFoundException("Incident not found");
    }
    return incident;
  }
}
