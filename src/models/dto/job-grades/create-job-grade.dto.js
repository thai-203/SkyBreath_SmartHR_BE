import { Type } from 'class-transformer';
import { IsString, IsNumber, Min, IsNotEmpty } from 'class-validator';

export class CreateJobGradeDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên bậc lương không được để trống' })
  gradeName;

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Lương cơ bản không được nhỏ hơn 0' })
  @IsNotEmpty({ message: 'Lương cơ bản là bắt buộc' })
  minSalary;

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Lương tối đa không được nhỏ hơn 0' })
  @IsNotEmpty({ message: 'Lương tối đa là bắt buộc' })
  maxSalary;
}
