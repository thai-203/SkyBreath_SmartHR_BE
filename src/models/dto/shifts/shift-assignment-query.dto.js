import {
  IsOptional,
  IsNumberString,
  IsDateString,
  IsString,
} from 'class-validator';

export class ShiftAssignmentQueryDto {
  @IsOptional()
  @IsNumberString({}, { message: 'Trang phải là số' })
  page;

  @IsOptional()
  @IsNumberString({}, { message: 'Số bản ghi phải là số' })
  limit;

  @IsOptional()
  @IsNumberString({}, { message: 'ID nhân viên phải là số' })
  employeeId;

  @IsOptional()
  @IsNumberString({}, { message: 'ID phòng ban phải là số' })
  departmentId;

  @IsOptional()
  @IsNumberString({}, { message: 'ID ca làm việc phải là số' })
  shiftId;

  @IsOptional()
  @IsDateString({}, { message: 'startDate phải là định dạng YYYY-MM-DD' })
  startDate;

  @IsOptional()
  @IsDateString({}, { message: 'endDate phải là định dạng YYYY-MM-DD' })
  endDate;

  @IsOptional()
  @IsString({ message: 'search phải là chuỗi' })
  search;

  @IsOptional()
  @IsString({ message: 'keyword phải là chuỗi' })
  keyword;
}
