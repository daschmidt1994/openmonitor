import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@openmonitor/shared";
import { AuthGuard } from "../../common/guards/auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { SystemService } from "./system.service";
import { UpdateSystemSettingsDto } from "./dto/update-settings.dto";

@ApiTags("system")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller("v1/system")
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get("info")
  async info() {
    return this.systemService.getInfo();
  }

  @Get("settings")
  async settings() {
    return this.systemService.getSettings();
  }

  @Patch("settings")
  async updateSettings(@Body() dto: UpdateSystemSettingsDto) {
    return this.systemService.updateSettings(dto);
  }
}
