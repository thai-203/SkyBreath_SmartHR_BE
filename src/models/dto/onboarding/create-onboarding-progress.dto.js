import {
  IsInt,
  IsDateString,
  IsNotEmpty
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOnboardingProgressDto {

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  employeeId;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  planId;

  @IsDateString()
  @IsNotEmpty()
  startDate;
}
