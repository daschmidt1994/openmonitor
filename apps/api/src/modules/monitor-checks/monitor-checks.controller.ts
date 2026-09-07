import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ApiScope } from "@openmonitor/shared";
import { AuthGuard, AuthenticatedUser } from "../../common/guards/auth.guard";
import { ScopesGuard } from "../../common/guards/scopes.guard";
import { Scopes } from "../../common/decorators/scopes.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { MonitorChecksService } from "./monitor-checks.service";
import { HistoryQueryDto } from "./dto/history-query.dto";

@ApiTags("monitor-results")
@ApiBearerAuth()
@UseGuards(AuthGuard, ScopesGuard)
@Controller("v1/monitors/:id/history")
export class MonitorChecksController {
  constructor(private readonly monitorChecksService: MonitorChecksService) {}

  @Scopes(ApiScope.MONITORS_READ)
  @Get()
  async history(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: HistoryQueryDto
  ) {
    return this.monitorChecksService.getHistory(user, id, query.range);
  }
}
