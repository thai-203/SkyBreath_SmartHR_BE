import { IsOptional, IsNumberString, IsNumber, IsDateString  } from 'class-validator';

export class ShiftAssignmentQueryDto {
  @IsOptional()
  @IsNumberString({}, { message: 'Trang phải là số' })
  page;

  @IsOptional()
  @IsNumberString({}, { message: 'Số bản ghi phải là số' })
  limit;

  @IsOptional()
  @IsNumber({}, { message: 'ID nhân viên phải là số' })
  employeeId;

  @IsOptional()
  @IsNumber({}, { message: 'ID phòng ban phải là số' })
  departmentId;

  @IsOptional()
  @IsNumber({}, { message: 'ID ca làm việc phải là số' })
  shiftId;

  @IsOptional()
  @IsDateString({}, { message: 'startDate phải là định dạng YYYY-MM-DD' })
  startDate;

  @IsOptional()
  @IsDateString({}, { message: 'endDate phải là định dạng YYYY-MM-DD' })
  endDate;
}
