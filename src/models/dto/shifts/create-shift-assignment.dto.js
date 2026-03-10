import {
  IsOptional,
  IsNumber,
  IsDateString,
  Validate,
  ValidatorConstraint,
} from 'class-validator';
import { Type } from 'class-transformer';

@ValidatorConstraint({ name: 'oneOfEmployeeOrDepartment', async: false })
class OneOfEmployeeOrDepartment {
  validate(value, args) {
    const obj = args.object;

    return (
      (!!obj.employeeId && !obj.departmentId) ||
      (!!obj.departmentId && !obj.employeeId)
    );
  }

  defaultMessage() {
    return 'Phải cung cấp employeeId hoặc departmentId (không được cả hai)';
  }
}

export class CreateShiftAssignmentDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'ID nhân viên phải là số' })
  employeeId;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'ID phòng ban phải là số' })
  departmentId;
  
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'ID ca làm việc phải là số' })
  shiftId;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày bắt đầu phải là định dạng YYYY-MM-DD' })
  effectiveFrom;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày kết thúc phải là định dạng YYYY-MM-DD' })
  effectiveTo;

  @Validate(OneOfEmployeeOrDepartment)
  _exclusiveCheck;
}
