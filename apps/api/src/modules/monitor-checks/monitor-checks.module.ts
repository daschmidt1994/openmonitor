import { Module } from "@nestjs/common";
import { MonitorsModule } from "../monitors/monitors.module";
import { MonitorChecksController } from "./monitor-checks.controller";
import { MonitorChecksService } from "./monitor-checks.service";

@Module({
  imports: [MonitorsModule],
  controllers: [MonitorChecksController],
  providers: [MonitorChecksService],
})
export class MonitorChecksModule {}
