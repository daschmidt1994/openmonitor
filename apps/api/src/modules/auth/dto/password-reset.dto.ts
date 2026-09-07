import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class RequestPasswordResetDto {
  @ApiProperty()
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  token!: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(256)
  @Matches(/[a-z]/, { message: "Password must contain a lowercase letter" })
  @Matches(/[A-Z]/, { message: "Password must contain an uppercase letter" })
  @Matches(/[0-9]/, { message: "Password must contain a digit" })
  newPassword!: string;
}
