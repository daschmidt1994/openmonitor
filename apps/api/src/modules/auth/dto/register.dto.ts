import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: "Username may only contain letters, digits, - and _" })
  username!: string;

  @ApiProperty({ description: "Min 10 chars, must include upper, lower and a digit" })
  @IsString()
  @MinLength(10)
  @MaxLength(256)
  @Matches(/[a-z]/, { message: "Password must contain a lowercase letter" })
  @Matches(/[A-Z]/, { message: "Password must contain an uppercase letter" })
  @Matches(/[0-9]/, { message: "Password must contain a digit" })
  password!: string;
}
