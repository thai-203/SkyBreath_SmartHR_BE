import {
  IsOptional,
  IsInt,
  IsString
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryOnboardingTaskDto {

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  planId;

  @IsOptional()
  @IsString()
  keyword;
}
