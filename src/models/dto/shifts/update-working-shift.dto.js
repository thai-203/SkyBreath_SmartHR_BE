import { IsString, MaxLength, IsOptional, IsNumber } from 'class-validator';

export class UpdateWorkingShiftDto {
  @IsOptional()
  @IsString({ message: 'Tên ca phải là chuỗi ký tự' })
  @MaxLength(100, { message: 'Tên ca không được vượt quá 100 ký tự' })
  shiftName;

  @IsOptional()
  @IsString({ message: 'Giờ bắt đầu phải là chuỗi' })
  startTime;

  @IsOptional()
  @IsString({ message: 'Giờ kết thúc phải là chuỗi' })
  endTime;

  @IsOptional()
  @IsString({ message: 'Giờ nghỉ bắt đầu phải là chuỗi' })
  breakStartTime;

  @IsOptional()
  @IsString({ message: 'Giờ nghỉ kết thúc phải là chuỗi' })
  breakEndTime;

  @IsOptional()
  @IsNumber({}, { message: 'ID nhóm ca phải là số' })
  groupId;
}
