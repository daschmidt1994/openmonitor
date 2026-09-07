import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ApiScope } from "@openmonitor/shared";
import { AuthGuard, AuthenticatedUser } from "../../common/guards/auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ScopesGuard } from "../../common/guards/scopes.guard";
import { Scopes } from "../../common/decorators/scopes.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { MonitorsService } from "./monitors.service";
import { CreateMonitorDto } from "./dto/create-monitor.dto";
import { UpdateMonitorDto } from "./dto/update-monitor.dto";
import { ListMonitorsQueryDto } from "./dto/list-monitors-query.dto";

@ApiTags("monitors")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard, ScopesGuard)
@Controller("v1/monitors")
export class MonitorsController {
  constructor(private readonly monitorsService: MonitorsService) {}

  @Scopes(ApiScope.MONITORS_READ)
  @Get("stats")
  async stats(@CurrentUser() user: AuthenticatedUser) {
    return this.monitorsService.stats(user);
  }

  @Scopes(ApiScope.MONITORS_READ)
  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListMonitorsQueryDto) {
    return this.monitorsService.findAll(user, query);
  }

  @Scopes(ApiScope.MONITORS_WRITE)
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMonitorDto) {
    return this.monitorsService.create(user, dto);
  }

  @Scopes(ApiScope.MONITORS_READ)
  @Get(":id")
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.monitorsService.findOneOwned(user, id);
  }

  @Scopes(ApiScope.MONITORS_WRITE)
  @Patch(":id")
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateMonitorDto
  ) {
    return this.monitorsService.update(user, id, dto);
  }

  @Scopes(ApiScope.MONITORS_WRITE)
  @Delete(":id")
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    await this.monitorsService.remove(user, id);
    return { success: true };
  }
}
