import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ApiScope } from "@openmonitor/shared";
import { AuthGuard, AuthenticatedUser } from "../../common/guards/auth.guard";
import { ScopesGuard } from "../../common/guards/scopes.guard";
import { Scopes } from "../../common/decorators/scopes.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { StatusPagesService } from "./status-pages.service";
import { CreateStatusPageDto } from "./dto/create-status-page.dto";
import { UpdateStatusPageDto } from "./dto/update-status-page.dto";
import { AddMonitorToStatusPageDto } from "./dto/add-monitor.dto";

@ApiTags("status-pages")
@Controller("v1/status-pages")
export class StatusPagesController {
  constructor(private readonly statusPagesService: StatusPagesService) {}

  /** Public: no authentication. Only returns pages with isPublic=true. */
  @Public()
  @Get("public/:slug")
  async getPublic(@Param("slug") slug: string) {
    return this.statusPagesService.getPublic(slug);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, ScopesGuard)
  @Scopes(ApiScope.STATUS_PAGES_READ)
  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.statusPagesService.list(user);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, ScopesGuard)
  @Scopes(ApiScope.STATUS_PAGES_WRITE)
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStatusPageDto) {
    return this.statusPagesService.create(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, ScopesGuard)
  @Scopes(ApiScope.STATUS_PAGES_READ)
  @Get(":id")
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.statusPagesService.findOneOwned(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, ScopesGuard)
  @Scopes(ApiScope.STATUS_PAGES_WRITE)
  @Patch(":id")
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusPageDto
  ) {
    return this.statusPagesService.update(user, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, ScopesGuard)
  @Scopes(ApiScope.STATUS_PAGES_WRITE)
  @Delete(":id")
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    await this.statusPagesService.remove(user, id);
    return { success: true };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, ScopesGuard)
  @Scopes(ApiScope.STATUS_PAGES_WRITE)
  @Post(":id/monitors/:monitorId")
  async addMonitor(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("monitorId", ParseUUIDPipe) monitorId: string,
    @Body() dto: AddMonitorToStatusPageDto
  ) {
    return this.statusPagesService.addMonitor(user, id, monitorId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, ScopesGuard)
  @Scopes(ApiScope.STATUS_PAGES_WRITE)
  @Delete(":id/monitors/:monitorId")
  async removeMonitor(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("monitorId", ParseUUIDPipe) monitorId: string
  ) {
    await this.statusPagesService.removeMonitor(user, id, monitorId);
    return { success: true };
  }
}
