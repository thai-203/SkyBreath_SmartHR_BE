import { IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateShiftAssignmentDto {
  @IsOptional()
  @IsNumber({}, { message: 'ID nhân viên phải là số' })
  employeeId;

  @IsOptional()
  @IsNumber({}, { message: 'ID phòng ban phải là số' })
  departmentId;

  @IsNumber({}, { message: 'ID ca làm việc phải là số' })
  shiftId;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày bắt đầu phải là định dạng YYYY-MM-DD' })
  effectiveFrom;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày kết thúc phải là định dạng YYYY-MM-DD' })
  effectiveTo;
}
