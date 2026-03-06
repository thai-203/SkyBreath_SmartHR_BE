import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsNumber,
  Validate,
} from 'class-validator';
import { ShiftTimeOrdering } from './time-validation.js';

export class CreateWorkingShiftDto {
  @IsString({ message: 'Tên ca phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên ca không được để trống' })
  @MaxLength(100, { message: 'Tên ca không được vượt quá 100 ký tự' })
  shiftName;

  @IsString({ message: 'Giờ bắt đầu phải là chuỗi' })
  @IsNotEmpty({ message: 'Giờ bắt đầu không được để trống' })
  startTime;

  @IsString({ message: 'Giờ kết thúc phải là chuỗi' })
  @IsNotEmpty({ message: 'Giờ kết thúc không được để trống' })
  endTime;

  @IsString({ message: 'Giờ nghỉ bắt đầu phải là chuỗi' })
  @IsNotEmpty({ message: 'Giờ nghỉ bắt đầu không được để trống' })
  breakStartTime;

  @IsString({ message: 'Giờ nghỉ kết thúc phải là chuỗi' })
  @IsNotEmpty({ message: 'Giờ nghỉ kết thúc không được để trống' })
  breakEndTime;

  @IsNumber({}, { message: 'ID nhóm ca phải là số' })
  @IsNotEmpty({ message: 'ID nhóm ca không được để trống' })
  groupId;

  @Validate(ShiftTimeOrdering)
  timeValidator;
}
