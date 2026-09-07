import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsTimeZone, Matches, MaxLength, MinLength } from "class-validator";

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsTimeZone()
  timezone?: string;
}
