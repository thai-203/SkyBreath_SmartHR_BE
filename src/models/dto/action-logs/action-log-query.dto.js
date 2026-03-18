import {
  IsOptional,
  IsString,
  IsInt,
  IsIn,
  Validate,
  ValidatorConstraint,
} from 'class-validator';
import { Type } from 'class-transformer';
import { parse, isValid, isAfter } from 'date-fns';

@ValidatorConstraint({ name: 'isFEDate', async: false })
class IsFEDateConstraint {
  validate(value) {
    if (!value) return true;

    const parsed = parse(value, 'dd/MM/yyyy', new Date());
    return isValid(parsed);
  }

  defaultMessage() {
    return 'Date must be valid format dd/MM/yyyy';
  }
}

@ValidatorConstraint({ name: 'notFutureDate', async: false })
class NotFutureDateConstraint {
  validate(value) {
    if (!value) return true;

    const parsed = parse(value, 'dd/MM/yyyy', new Date());

    if (!isValid(parsed)) return false;

    return !isAfter(parsed, new Date());
  }

  defaultMessage() {
    return 'Date cannot be in the future';
  }
}

export class ActionLogQueryDto {

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  page = 1;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  limit = 10;

  @IsOptional()
  @IsString()
  search;

  @IsString()
  @IsOptional()
  actionType;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  userId;

  @IsString()
  @IsOptional()
  targetTable;

  @IsOptional()
  @Validate(IsFEDateConstraint)
  @Validate(NotFutureDateConstraint)
  fromDate;

  @IsOptional()
  @Validate(IsFEDateConstraint)
  @Validate(NotFutureDateConstraint)
  toDate;

  @IsOptional()
  @IsString()
  @IsIn(['SUCCESS', 'FAILED'])
  status;

  @IsString()
  @IsOptional()
  sortBy;

  @IsString()
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder = 'DESC';

  get skip() {
    return (this.page - 1) * this.limit;
  }
}