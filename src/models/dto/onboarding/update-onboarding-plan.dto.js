import {
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  Min
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateOnboardingPlanDto {

  @IsOptional()
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
  positionId;

  @IsOptional()
  @IsBoolean()
  isTemplate;
}
