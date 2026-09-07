import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import { CheckStatus, MonitorType } from "@openmonitor/shared";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class ListMonitorsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: MonitorType })
  @IsOptional()
  @IsEnum(MonitorType)
  type?: MonitorType;

  @ApiPropertyOptional({ enum: CheckStatus })
  @IsOptional()
  @IsEnum(CheckStatus)
  status?: CheckStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: "Comma-separated tag names" })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Admin only: include every user's monitors" })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  all?: boolean;
}
