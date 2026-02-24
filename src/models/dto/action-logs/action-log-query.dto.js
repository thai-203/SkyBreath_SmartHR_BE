import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class ActionLogQueryDto {
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  page = 1;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  limit = 10;

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

  @IsString()
  @IsOptional()
  startDate;

  @IsString()
  @IsOptional()
  endDate;

  @IsString()
  @IsOptional()
  sortBy;

  @IsString()
  @IsOptional()
  sortOrder = 'DESC';

  get skip() {
    return (this.page - 1) * this.limit;
  }
}
