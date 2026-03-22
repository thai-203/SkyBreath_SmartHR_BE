import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateOnboardingTaskDto {
  @IsOptional()
  @IsNotEmpty({ message: 'Mô tả không được để trống' })
  @IsString()
  description;

  @IsOptional()
  @IsNotEmpty({ message: 'Trường bắt buộc không được để trống' })
  @IsBoolean({ message: 'isMandatory phải là boolean' })
  isMandatory;

  @IsOptional()
  @IsNotEmpty({ message: 'Số ngày dự kiến không được để trống' })
  @Type(() => Number)
  @IsInt({ message: 'Số ngày dự kiến phải là số nguyên' })
  @Min(1, { message: 'Số ngày dự kiến phải lớn hơn 0' })
  estimatedDays;

  @IsOptional()
  @IsNotEmpty({ message: 'Danh mục không được để trống' })
  @IsString()
  category;
}
