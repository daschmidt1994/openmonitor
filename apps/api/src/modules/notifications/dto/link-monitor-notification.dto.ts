import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator";

export class LinkMonitorNotificationDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  notifyOnDown?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  notifyOnRecovery?: boolean = true;

  @ApiPropertyOptional({ default: 0, description: "0 = do not resend while still down" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10080)
  resendIntervalMinutes?: number = 0;
}
