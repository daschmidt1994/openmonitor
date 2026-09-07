import { Module } from "@nestjs/common";
import { MonitorsController } from "./monitors.controller";
import { MonitorsService } from "./monitors.service";
import { TagsController } from "./tags.controller";
import { TagsService } from "./tags.service";

@Module({
  controllers: [MonitorsController, TagsController],
  providers: [MonitorsService, TagsService],
  exports: [MonitorsService],
})
export class MonitorsModule {}
