import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthGuard, AuthenticatedUser } from "../../common/guards/auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ApiTokensService } from "./api-tokens.service";
import { CreateApiTokenDto } from "./dto/create-api-token.dto";

@ApiTags("api-tokens")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("v1/api-tokens")
export class ApiTokensController {
  constructor(private readonly apiTokensService: ApiTokensService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.apiTokensService.list(user);
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateApiTokenDto) {
    return this.apiTokensService.create(user, dto);
  }

  @Delete(":id")
  async revoke(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    await this.apiTokensService.revoke(user, id);
    return { success: true };
  }
}
