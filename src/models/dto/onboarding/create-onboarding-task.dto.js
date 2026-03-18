import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOnboardingTaskDto {
  @IsNotEmpty({ message: 'Mô tả không được để trống' })
  @IsString()
  description;

  @IsNotEmpty({ message: 'Trường bắt buộc không được để trống' })
  @IsBoolean({ message: 'isMandatory phải là boolean' })
  isMandatory;

  @IsNotEmpty({ message: 'Số ngày dự kiến không được để trống' })
  @Type(() => Number)
  @IsInt({ message: 'Số ngày dự kiến phải là số nguyên' })
  @Min(1, { message: 'Số ngày dự kiến phải lớn hơn 0' })
  estimatedDays;

  @IsNotEmpty({ message: 'Danh mục không được để trống' })
  @IsString()
  category;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Thứ tự task phải là số nguyên' })
  @Min(1, { message: 'Thứ tự task phải lớn hơn 0' })
  taskOrder;
}
