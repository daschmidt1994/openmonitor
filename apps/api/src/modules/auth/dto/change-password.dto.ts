import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(256)
  @Matches(/[a-z]/, { message: "Password must contain a lowercase letter" })
  @Matches(/[A-Z]/, { message: "Password must contain an uppercase letter" })
  @Matches(/[0-9]/, { message: "Password must contain a digit" })
  newPassword!: string;
}
