import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  IsNotEmpty
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOnboardingTaskDto {

  @IsString()
  @IsNotEmpty()
  taskTitle;

  @IsOptional()
  @IsString()
  description;

  @IsBoolean()
  isMandatory;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  estimatedDays;

  @IsOptional()
  @IsString()
  category;
}
