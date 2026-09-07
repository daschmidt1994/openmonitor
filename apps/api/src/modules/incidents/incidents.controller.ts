import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ApiScope } from "@openmonitor/shared";
import { AuthGuard, AuthenticatedUser } from "../../common/guards/auth.guard";
import { ScopesGuard } from "../../common/guards/scopes.guard";
import { Scopes } from "../../common/decorators/scopes.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { IncidentsService } from "./incidents.service";
import { ListIncidentsQueryDto } from "./dto/list-incidents-query.dto";

@ApiTags("incidents")
@ApiBearerAuth()
@UseGuards(AuthGuard, ScopesGuard)
@Controller("v1/incidents")
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Scopes(ApiScope.INCIDENTS_READ)
  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListIncidentsQueryDto) {
    return this.incidentsService.findAll(user, query);
  }

  @Scopes(ApiScope.INCIDENTS_READ)
  @Get(":id")
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.incidentsService.findOne(user, id);
  }
}
