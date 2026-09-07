import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@openmonitor/shared";
import { AuthGuard, AuthenticatedUser } from "../../common/guards/auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { UsersService } from "./users.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller("v1")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getById(user.id);
  }

  @Patch("me")
  async updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Roles(Role.ADMIN)
  @Get("users")
  async listUsers(@Query() query: PaginationQueryDto) {
    return this.usersService.listAll(query);
  }

  @Roles(Role.ADMIN)
  @Post("users")
  async createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createByAdmin(dto);
  }

  @Roles(Role.ADMIN)
  @Get("users/:id")
  async getUser(@Param("id", ParseUUIDPipe) id: string) {
    return this.usersService.getById(id);
  }

  @Roles(Role.ADMIN)
  @Patch("users/:id")
  async updateUser(
    @CurrentUser() admin: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto
  ) {
    return this.usersService.updateByAdmin(admin.id, id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete("users/:id")
  async deleteUser(@CurrentUser() admin: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    await this.usersService.deleteByAdmin(admin.id, id);
    return { success: true };
  }
}
