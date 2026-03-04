import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateShiftGroupDto {
  @IsString({ message: 'Tên nhóm ca phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên nhóm ca không được để trống' })
  @MaxLength(100, { message: 'Tên nhóm ca không được vượt quá 100 ký tự' })
  groupName;

  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Mô tả không được vượt quá 500 ký tự' })
  description;
}
