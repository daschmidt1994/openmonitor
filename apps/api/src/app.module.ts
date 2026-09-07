import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { validate } from "./config/configuration";
import { PrismaModule } from "./common/prisma/prisma.module";
import { AuditLogModule } from "./common/audit/audit-log.module";
import { SystemSettingsModule } from "./common/system-settings/system-settings.module";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { AuthGuard } from "./common/guards/auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { ScopesGuard } from "./common/guards/scopes.guard";
import { ReadOnlyGuard } from "./common/guards/read-only.guard";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { MonitorsModule } from "./modules/monitors/monitors.module";
import { MonitorChecksModule } from "./modules/monitor-checks/monitor-checks.module";
import { IncidentsModule } from "./modules/incidents/incidents.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { StatusPagesModule } from "./modules/status-pages/status-pages.module";
import { ApiTokensModule } from "./modules/api-tokens/api-tokens.module";
import { SystemModule } from "./modules/system/system.module";
import { HealthModule } from "./modules/health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
    }),
    PrismaModule,
    AuditLogModule,
    SystemSettingsModule,
    HealthModule,
    AuthModule,
    UsersModule,
    MonitorsModule,
    MonitorChecksModule,
    IncidentsModule,
    NotificationsModule,
    StatusPagesModule,
    ApiTokensModule,
    SystemModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ScopesGuard },
    { provide: APP_GUARD, useClass: ReadOnlyGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
