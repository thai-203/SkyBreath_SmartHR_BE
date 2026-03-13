import {
  IsOptional,
  IsNumber,
  IsDateString,
  Validate,
  ValidatorConstraint,
  IsArray,
  ArrayNotEmpty,
  IsIn,
  ArrayUnique,
} from 'class-validator';
import { Type } from 'class-transformer';

// require at least one of employeeIds or departmentIds (can supply both)
@ValidatorConstraint({ name: 'oneOfEmployeeOrDepartment', async: false })
class OneOfEmployeeOrDepartment {
  validate(value, args) {
    const obj = args.object;
    return (
      (!!obj.employeeIds && obj.employeeIds.length > 0) ||
      (!!obj.departmentIds && obj.departmentIds.length > 0)
    );
  }

  defaultMessage() {
    return 'Phải cung cấp employeeIds hoặc departmentIds';
  }
}

// ensure at least one shift identifier is provided
@ValidatorConstraint({ name: 'oneOfShift', async: false })
class OneOfShift {
  validate(value, args) {
    const obj = args.object;
    return (!!obj.shiftIds && obj.shiftIds.length > 0) || !!obj.shiftId;
  }
  defaultMessage() {
    return 'Phải cung cấp shiftId hoặc shiftIds';
  }
}

// validate the start/end date order when both are present
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

// require weekdays when using weekly/2weeks repeat types
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

export class CreateShiftAssignmentDto {
  // allow both single and multiple by using arrays
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

  // support multiple shifts
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

  // composable validators applied at the class level
  @Validate(OneOfEmployeeOrDepartment)
  _exclusiveCheck;

  @Validate(OneOfShift)
  _mustHaveShift;

  @Validate(DateRange)
  _dateRangeCheck;

  @Validate(WeekdayForRepeat)
  _weekdayRequirement;
}
