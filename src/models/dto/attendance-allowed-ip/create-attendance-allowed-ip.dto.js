import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateAttendanceAllowedIpDto {
  @IsString()
  @IsNotEmpty()
  ipRange;

  @IsOptional()
  @IsString()
  description;

  @IsOptional()
  @IsBoolean()
  isActive;
}
