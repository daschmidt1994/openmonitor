import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ApiScope } from "@openmonitor/shared";
import { AuthGuard, AuthenticatedUser } from "../../common/guards/auth.guard";
import { ScopesGuard } from "../../common/guards/scopes.guard";
import { Scopes } from "../../common/decorators/scopes.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { NotificationsService } from "./notifications.service";
import { CreateProviderDto } from "./dto/create-provider.dto";
import { UpdateProviderDto } from "./dto/update-provider.dto";
import { LinkMonitorNotificationDto } from "./dto/link-monitor-notification.dto";

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(AuthGuard, ScopesGuard)
@Controller("v1")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Scopes(ApiScope.NOTIFICATIONS_READ)
  @Get("notifications")
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.list(user);
  }

  @Scopes(ApiScope.NOTIFICATIONS_WRITE)
  @Post("notifications")
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProviderDto) {
    return this.notificationsService.create(user, dto);
  }

  @Scopes(ApiScope.NOTIFICATIONS_READ)
  @Get("notifications/:id")
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.notificationsService.findOneOwned(user, id);
  }

  @Scopes(ApiScope.NOTIFICATIONS_WRITE)
  @Patch("notifications/:id")
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateProviderDto
  ) {
    return this.notificationsService.update(user, id, dto);
  }

  @Scopes(ApiScope.NOTIFICATIONS_WRITE)
  @Delete("notifications/:id")
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    await this.notificationsService.remove(user, id);
    return { success: true };
  }

  @Scopes(ApiScope.NOTIFICATIONS_WRITE)
  @Post("notifications/:id/test")
  async sendTest(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.notificationsService.sendTest(user, id);
  }

  @Scopes(ApiScope.NOTIFICATIONS_READ)
  @Get("monitors/:monitorId/notifications")
  async listForMonitor(@CurrentUser() user: AuthenticatedUser, @Param("monitorId", ParseUUIDPipe) monitorId: string) {
    return this.notificationsService.listForMonitor(user, monitorId);
  }

  @Scopes(ApiScope.NOTIFICATIONS_WRITE)
  @Post("monitors/:monitorId/notifications/:providerId")
  async link(
    @CurrentUser() user: AuthenticatedUser,
    @Param("monitorId", ParseUUIDPipe) monitorId: string,
    @Param("providerId", ParseUUIDPipe) providerId: string,
    @Body() dto: LinkMonitorNotificationDto
  ) {
    return this.notificationsService.linkMonitor(user, monitorId, providerId, dto);
  }

  @Scopes(ApiScope.NOTIFICATIONS_WRITE)
  @Delete("monitors/:monitorId/notifications/:providerId")
  async unlink(
    @CurrentUser() user: AuthenticatedUser,
    @Param("monitorId", ParseUUIDPipe) monitorId: string,
    @Param("providerId", ParseUUIDPipe) providerId: string
  ) {
    await this.notificationsService.unlinkMonitor(user, monitorId, providerId);
    return { success: true };
  }
}
