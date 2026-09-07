import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { PrismaService } from "../../common/prisma/prisma.service";

@ApiTags("system")
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: process is up. Does not touch the database. */
  @Public()
  @Get("health")
  health() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  /** Readiness: process is up AND can reach the database. */
  @Public()
  @Get("ready")
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", timestamp: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException("Database is not reachable");
    }
  }
}
