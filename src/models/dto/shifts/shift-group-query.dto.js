import { IsOptional, IsNumberString, IsString } from 'class-validator';

export class ShiftGroupQueryDto {
  @IsOptional()
  @IsNumberString({}, { message: 'Trang phải là số' })
  page;

  @IsOptional()
  @IsNumberString({}, { message: 'Số bản ghi phải là số' })
  limit;

  @IsOptional()
  @IsString({ message: 'Từ khóa phải là chuỗi ký tự' })
  search;
}
