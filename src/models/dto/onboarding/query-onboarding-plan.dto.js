import {
  IsOptional,
  IsInt,
  IsBoolean,
  IsString
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryOnboardingPlanDto {

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  departmentId;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  positionId;

  @IsOptional()
  @IsBoolean()
  isTemplate;

  @IsOptional()
  @IsString()
  keyword;
}
