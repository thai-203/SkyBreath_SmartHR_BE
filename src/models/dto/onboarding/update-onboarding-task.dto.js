import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateOnboardingTaskDto {

  @IsOptional()
  @IsString()
  description;

  @IsOptional()
  @IsBoolean()
  isMandatory;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedDays;

  @IsOptional()
  @IsString()
  category;
}
