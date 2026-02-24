import { IsOptional, IsString, IsInt, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class EmployeeQueryDto {
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
    search;

    @IsString()
    @IsOptional()
    sortBy;

    @IsString()
    @IsOptional()
    sortOrder = 'DESC';

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    departmentId;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    positionId;

    @IsString()
    @IsOptional()
    @IsIn(['PROBATION', 'ACTIVE', 'ON_LEAVE', 'TERMINATED'])
    employmentStatus;

    get skip() {
        return (this.page - 1) * this.limit;
    }
}
