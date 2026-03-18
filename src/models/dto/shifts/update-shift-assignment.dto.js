import {
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  ArrayNotEmpty,
  IsIn,
  ArrayUnique,
  Validate,
  ValidatorConstraint,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

// reuse some of the same validators from create dto
@ValidatorConstraint({ name: 'dateRange', async: false })
class DateRange {
  validate(value, args) {
    const obj = args.object;
    if (obj.startDate && obj.endDate) {
      return new Date(obj.startDate) <= new Date(obj.endDate);
    }
    return true;
  }
  defaultMessage() {
    return 'startDate phải nhỏ hơn hoặc bằng endDate';
  }
}

@ValidatorConstraint({ name: 'weekdayForRepeat', async: false })
class WeekdayForRepeat {
  validate(value, args) {
    const obj = args.object;
    if (obj.repeatType === 'weekly' || obj.repeatType === '2weeks') {
      return obj.weekdays && obj.weekdays.length > 0;
    }
    return true;
  }
  defaultMessage() {
    return 'Khi repeatType là weekly hoặc 2weeks phải cung cấp weekdays';
  }
}

export class UpdateShiftAssignmentDto {
  @IsOptional()
  @IsString({ message: 'Tên bản phân ca phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên bản phân ca không được để trống' })
  assignmentName;

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

  // class-level checks added via Validate decorator at bottom

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

  @Validate(DateRange)
  _dateRangeCheck;

  @Validate(WeekdayForRepeat)
  _weekdayRequirement;

  // additional validators will be applied via external constraint classes below
}
