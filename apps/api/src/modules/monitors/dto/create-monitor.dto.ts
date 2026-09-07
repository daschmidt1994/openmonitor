import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { DnsRecordType, MonitorType } from "@openmonitor/shared";

export class CreateMonitorDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ enum: MonitorType })
  @IsEnum(MonitorType)
  type!: MonitorType;

  @ApiProperty({ description: "URL for HTTP/SSL/JSON_QUERY, hostname for PING/DNS/TCP" })
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  target!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional({ default: 60, description: "seconds" })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(86400)
  interval?: number = 60;

  @ApiPropertyOptional({ default: 10, description: "seconds" })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  timeout?: number = 10;

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  retries?: number = 3;

  @ApiPropertyOptional({ default: 20, description: "seconds between retries" })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3600)
  retryInterval?: number = 20;

  @ApiPropertyOptional({ default: "GET" })
  @IsOptional()
  @IsString()
  httpMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  httpHeaders?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(65536)
  httpBody?: string;

  @ApiPropertyOptional({ default: "200-299" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  expectedStatusCodes?: string = "200-299";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  keyword?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  keywordInverted?: boolean = false;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  followRedirects?: boolean = true;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  ignoreTlsErrors?: boolean = false;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  jsonPath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  jsonExpectedValue?: string;

  @ApiPropertyOptional({ enum: DnsRecordType })
  @IsOptional()
  @IsEnum(DnsRecordType)
  dnsRecordType?: DnsRecordType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  dnsExpectedValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  dnsResolver?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  checkSslExpiry?: boolean = false;

  @ApiPropertyOptional({ default: 14 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  sslExpiryThresholdDays?: number = 14;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  upsideDown?: boolean = false;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean = true;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  tagIds?: string[];
}
