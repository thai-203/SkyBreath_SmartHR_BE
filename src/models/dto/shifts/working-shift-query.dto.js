import {
  IsOptional,
  IsNumberString,
  IsString,
  IsNumber,
} from 'class-validator';

export class WorkingShiftQueryDto {
  @IsOptional()
  @IsNumberString({}, { message: 'Trang phải là số' })
  page;

  @IsOptional()
  @IsNumberString({}, { message: 'Số bản ghi phải là số' })
  limit;

  @IsOptional()
  @IsNumber({}, { message: 'ID nhóm ca phải là số' })
  groupId;

  @IsOptional()
  @IsString({ message: 'Từ khóa phải là chuỗi ký tự' })
  search;
}
