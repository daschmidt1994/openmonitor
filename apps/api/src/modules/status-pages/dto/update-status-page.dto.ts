import { PartialType, OmitType } from "@nestjs/swagger";
import { CreateStatusPageDto } from "./create-status-page.dto";

export class UpdateStatusPageDto extends PartialType(OmitType(CreateStatusPageDto, ["slug"] as const)) {}
