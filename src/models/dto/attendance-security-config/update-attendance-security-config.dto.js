import { Type } from 'class-transformer';
import {
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';

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
  @Type(() => Number)
  officeLatitude;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
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
