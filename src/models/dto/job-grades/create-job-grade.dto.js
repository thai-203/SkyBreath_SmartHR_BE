import { IsString, IsNumber, IsOptional, Min, IsNotEmpty } from 'class-validator';

export class CreateJobGradeDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên bậc lương không được để trống' })
  name;

  @IsString()
  @IsOptional()
  description;

  @IsNumber()
  @Min(0, { message: 'Lương cơ bản không được nhỏ hơn 0' })
  @IsNotEmpty({ message: 'Lương cơ bản là bắt buộc' })
  baseSalary;

  @IsNumber()
  @Min(0)
  @IsOptional()
  allowance;
}