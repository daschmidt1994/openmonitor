import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { sendNotification, validateProviderConfig } from "@openmonitor/notifications";
import { Role } from "@openmonitor/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuditLogService } from "../../common/audit/audit-log.service";
import type { AuthenticatedUser } from "../../common/guards/auth.guard";
import { MonitorsService } from "../monitors/monitors.service";
import type { CreateProviderDto } from "./dto/create-provider.dto";
import type { UpdateProviderDto } from "./dto/update-provider.dto";
import type { LinkMonitorNotificationDto } from "./dto/link-monitor-notification.dto";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly monitorsService: MonitorsService
  ) {}

  async list(user: AuthenticatedUser) {
    return this.prisma.notificationProvider.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  }

  async create(user: AuthenticatedUser, dto: CreateProviderDto) {
    this.validateConfigOrThrow(dto.type, dto.config);
    const provider = await this.prisma.notificationProvider.create({
      data: { userId: user.id, name: dto.name, type: dto.type, config: dto.config as any, active: dto.active ?? true },
    });
    await this.auditLog.record({ userId: user.id, action: "notification.create", targetType: "NotificationProvider", targetId: provider.id });
    return provider;
  }

  async findOneOwned(user: AuthenticatedUser, id: string) {
    const provider = await this.prisma.notificationProvider.findUnique({ where: { id } });
    if (!provider || (provider.userId !== user.id && user.role !== Role.ADMIN)) {
      throw new NotFoundException("Notification provider not found");
    }
    return provider;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateProviderDto) {
    const existing = await this.findOneOwned(user, id);
    if (dto.config) this.validateConfigOrThrow(existing.type as any, dto.config);
    const provider = await this.prisma.notificationProvider.update({ where: { id: existing.id }, data: dto as any });
    await this.auditLog.record({ userId: user.id, action: "notification.update", targetType: "NotificationProvider", targetId: id });
    return provider;
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    const existing = await this.findOneOwned(user, id);
    await this.prisma.notificationProvider.delete({ where: { id: existing.id } });
    await this.auditLog.record({ userId: user.id, action: "notification.delete", targetType: "NotificationProvider", targetId: id });
  }

  async sendTest(user: AuthenticatedUser, id: string) {
    const provider = await this.findOneOwned(user, id);
    const result = await sendNotification(provider.type as any, provider.config, {
      eventType: "DOWN",
      monitorName: "Test Monitor",
      monitorTarget: "https://example.com",
      message: "This is a test notification from OpenMonitor.",
      occurredAt: new Date(),
    });
    if (!result.success) {
      throw new BadRequestException(`Test notification failed: ${result.error}`);
    }
    return { success: true };
  }

  async linkMonitor(user: AuthenticatedUser, monitorId: string, providerId: string, dto: LinkMonitorNotificationDto) {
    const monitor = await this.monitorsService.findOneOwned(user, monitorId);
    const provider = await this.findOneOwned(user, providerId);

    return this.prisma.monitorNotification.upsert({
      where: { monitorId_providerId: { monitorId: monitor.id, providerId: provider.id } },
      create: { monitorId: monitor.id, providerId: provider.id, ...dto },
      update: dto,
    });
  }

  async unlinkMonitor(user: AuthenticatedUser, monitorId: string, providerId: string): Promise<void> {
    const monitor = await this.monitorsService.findOneOwned(user, monitorId);
    await this.findOneOwned(user, providerId);
    await this.prisma.monitorNotification.deleteMany({ where: { monitorId: monitor.id, providerId } });
  }

  async listForMonitor(user: AuthenticatedUser, monitorId: string) {
    const monitor = await this.monitorsService.findOneOwned(user, monitorId);
    return this.prisma.monitorNotification.findMany({
      where: { monitorId: monitor.id },
      include: { provider: true },
    });
  }

  private validateConfigOrThrow(type: Parameters<typeof validateProviderConfig>[0], config: unknown) {
    try {
      validateProviderConfig(type, config);
    } catch (err) {
      throw new BadRequestException(`Invalid provider config: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }
}
