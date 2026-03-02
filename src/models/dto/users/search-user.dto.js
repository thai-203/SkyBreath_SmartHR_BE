import {
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';

export class SearchUserDto {
  @IsOptional()
  @IsString()
  search; // Search by username, email, fullName

  @IsOptional()
  @IsArray()
  @IsEnum(['ADMIN', 'MANAGER', 'EMPLOYEE', 'USER'], { each: true })
  roles; // Filter by role names

  @IsOptional()
  @IsArray()
  @IsEnum(['ACTIVE', 'LOCKED', 'DELETED'], { each: true })
  statuses; // Filter by status

  @IsOptional()
  @IsNumber()
  @Min(1)
  page = 1;

  @IsOptional()
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
