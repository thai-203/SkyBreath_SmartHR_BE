import {
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';

import { Transform, Type } from 'class-transformer';

export class SearchUserDto {
  @IsOptional()
  @IsString()
  search; // Search by username, email, fullName

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return value;
    if (Array.isArray(value)) return value.map(Number);
    if (typeof value === 'object') return Object.values(value).map(Number);
    if (typeof value === 'string' && value.includes(',')) return value.split(',').map(Number);
    return [Number(value)];
  })
  @IsArray()
  @IsNumber({}, { each: true })
  roles; // Filter by role IDs

  @IsOptional()
  @IsArray()
  @IsEnum(['ACTIVE', 'LOCKED', 'DELETED'], { each: true })
  statuses; // Filter by status

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit = 10;

  @IsOptional()
  @IsString()
  @IsEnum([
    'id',
    'username',
    'email',
    'fullName',
    'status',
    'createdAt',
    'lastLoginTime',
  ])
  sortBy = 'createdAt';

  @IsOptional()
  @IsString()
  @IsEnum(['ASC', 'DESC'])
  sortOrder = 'DESC';

  get skip() {
    return (this.page - 1) * this.limit;
  }
}
