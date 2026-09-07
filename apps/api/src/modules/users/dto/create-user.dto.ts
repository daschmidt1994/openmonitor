import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { Role } from "@openmonitor/shared";

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  username!: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(256)
  password!: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role!: Role;
}
