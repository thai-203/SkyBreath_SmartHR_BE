import { IsOptional, IsBoolean, IsNumber, Min, IsArray, ArrayNotEmpty, IsString } from 'class-validator';

export class UpdateAttendanceSecurityConfigDto {
  @IsOptional()
  @IsBoolean()
  requireIpCheck;

  @IsOptional()
  @IsBoolean()
  allowPublicNetwork;

  @IsOptional()
  @IsBoolean()
  requireLocationCheck;

  @IsOptional()
  @IsNumber()
  officeLatitude;

  @IsOptional()
  @IsNumber()
  officeLongitude;

  @IsOptional()
  @IsNumber()
  @Min(0)
  locationRadiusMeters;

  @IsOptional()
  @IsBoolean()
  requireSingleFace;

  @IsOptional()
  @IsBoolean()
  blockVpn;
}
