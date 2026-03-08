import { IsOptional, IsNumber, IsDateString } from 'class-validator';

export class UpdateShiftAssignmentDto {
  @IsOptional()
  @IsNumber({}, { message: 'ID ca làm việc phải là số' })
  shiftId;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày bắt đầu phải là định dạng YYYY-MM-DD' })
  effectiveFrom;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày kết thúc phải là định dạng YYYY-MM-DD' })
  effectiveTo;
}
