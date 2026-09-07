import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator";

export class UpdateSystemSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  registrationEnabled?: boolean;

  @ApiPropertyOptional({ description: "Days of MonitorCheck history to retain before automatic pruning" })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  checkRetentionDays?: number;
}
