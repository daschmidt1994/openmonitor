import { PartialType, OmitType } from "@nestjs/swagger";
import { CreateProviderDto } from "./create-provider.dto";

export class UpdateProviderDto extends PartialType(OmitType(CreateProviderDto, ["type"] as const)) {}
