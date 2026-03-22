import { IsOptional, IsDateString, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ScheduleQueryDto {
  @IsOptional()
  @IsDateString({}, { message: 'startDate phải là YYYY-MM-DD' })
  startDate;

  @IsOptional()
  @IsDateString({}, { message: 'endDate phải là YYYY-MM-DD' })
  endDate;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'departmentId phải là số' })
  departmentId;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'shiftId phải là số' })
  shiftId;

  @IsOptional()
  @IsString({ message: 'keyword phải là chuỗi' })
  keyword;
}
