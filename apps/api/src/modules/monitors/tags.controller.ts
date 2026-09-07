import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags as SwaggerApiTags } from "@nestjs/swagger";
import { AuthGuard, AuthenticatedUser } from "../../common/guards/auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { TagsService } from "./tags.service";
import { CreateTagDto } from "./dto/create-tag.dto";

@SwaggerApiTags("monitors")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("v1/tags")
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.tagsService.list(user);
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTagDto) {
    return this.tagsService.create(user, dto);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    await this.tagsService.remove(user, id);
    return { success: true };
  }
}
