import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsNotEmpty,
  Min,
  Allow
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOnboardingPlanDto {

  @IsString()
  @IsNotEmpty()
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
  isTemplate = false;

  /**
   * Chỉ dùng khi tạo TEMPLATE
   * Validate nghiệp vụ ở service
   */
  @IsOptional()
  @Allow()
  tasks;
}
