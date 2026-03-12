import {
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  ArrayNotEmpty,
  IsIn,
  ArrayUnique,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateShiftAssignmentDto {
  @IsOptional()
  @IsArray({ message: 'employeeIds phải là mảng số' })
  @ArrayNotEmpty({ message: 'employeeIds không được rỗng' })
  @Type(() => Number)
  @IsNumber(
    {},
    { each: true, message: 'Mỗi phần tử trong employeeIds phải là số' },
  )
  employeeIds;

  @IsOptional()
  @IsArray({ message: 'departmentIds phải là mảng số' })
  @ArrayNotEmpty({ message: 'departmentIds không được rỗng' })
  @Type(() => Number)
  @IsNumber(
    {},
    { each: true, message: 'Mỗi phần tử trong departmentIds phải là số' },
  )
  departmentIds;

  // allow array of shift ids as well
  @IsOptional()
  @IsArray({ message: 'shiftIds phải là mảng số' })
  @ArrayNotEmpty({ message: 'shiftIds không được rỗng' })
  @Type(() => Number)
  @IsNumber(
    {},
    { each: true, message: 'Mỗi phần tử trong shiftIds phải là số' },
  )
  shiftIds;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày bắt đầu phải là định dạng YYYY-MM-DD' })
  startDate;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày kết thúc phải là định dạng YYYY-MM-DD' })
  endDate;

  @IsOptional()
  @IsArray({ message: 'weekdays phải là mảng số từ 1 đến 7' })
  @ArrayNotEmpty({ message: 'weekdays không được rỗng' })
  @Type(() => Number)
  @IsIn([1, 2, 3, 4, 5, 6, 7], {
    each: true,
    message: 'Giá trị trong weekdays phải là một trong 1..7',
  })
  @ArrayUnique({ message: 'Giá trị trong weekdays phải là duy nhất' })
  weekdays;

  @IsOptional()
  @IsIn(['weekly', '2weeks', 'monthly'], {
    message: 'repeatType phải là một trong [weekly, 2weeks, monthly]',
  })
  repeatType;
}
