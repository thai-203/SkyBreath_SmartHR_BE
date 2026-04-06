import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsIn,
  Min,
  Allow,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOnboardingPlanDto {
  @IsString()
  planName;

  @IsOptional()
  @IsString()
  description;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  departmentId;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  employeeId; // required for non-template plans

  @IsOptional()
  @IsString()
  startDate;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  durationDays;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  positionId;

  @IsOptional()
  @IsBoolean()
  isTemplate = false;

  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'DRAFT'])
  status;

  @IsOptional()
  @Allow()
  tasks;
}
