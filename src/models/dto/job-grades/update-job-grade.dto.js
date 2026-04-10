import { Type } from 'class-transformer';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateJobGradeDto {
  @IsString()
  @IsOptional()
  gradeName;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minSalary;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxSalary;
}
