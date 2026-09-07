import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsHexColor, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateTagDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsHexColor()
  color?: string;
}
