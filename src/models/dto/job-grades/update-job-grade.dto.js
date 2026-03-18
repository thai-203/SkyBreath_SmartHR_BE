import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateJobGradeDto {
  @IsString()
  @IsOptional()
  name;

  @IsString()
  @IsOptional()
  description;

  @IsNumber()
  @Min(0)
  @IsOptional()
  baseSalary;

  @IsNumber()
  @Min(0)
  @IsOptional()
  allowance;
}