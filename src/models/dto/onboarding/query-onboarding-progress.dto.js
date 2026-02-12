import {
  IsOptional,
  IsInt,
  IsString
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryOnboardingProgressDto {

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  employeeId;

  @IsOptional()
  @IsString()
  overallStatus;
}
