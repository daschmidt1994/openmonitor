import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { NotificationType } from "@openmonitor/shared";

export class CreateProviderDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiProperty({ description: "Provider-specific config, validated per type (see docs)." })
  @IsObject()
  config!: Record<string, unknown>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}
