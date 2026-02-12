import {
  IsOptional,
  IsDateString,
  IsString,
  IsInt
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateOnboardingProgressDto {

  @IsOptional()
  @IsString()
  overallStatus;

  @IsOptional()
  @IsDateString()
  expectedEndDate;

  @IsOptional()
  @IsDateString()
  actualEndDate;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  assignedMentorId;
}
