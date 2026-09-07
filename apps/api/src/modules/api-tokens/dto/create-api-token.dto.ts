import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { ApiScope } from "@openmonitor/shared";

export class CreateApiTokenDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: ApiScope, isArray: true })
  @IsArray()
  @IsEnum(ApiScope, { each: true })
  scopes!: ApiScope[];

  @ApiPropertyOptional({ description: "ISO 8601 date; omit for a non-expiring token" })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
