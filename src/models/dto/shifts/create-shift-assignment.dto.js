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

  @Validate(OneOfEmployeeOrDepartment)
  _exclusiveCheck;
}
