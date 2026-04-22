import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PerformanceReviewQueryDto {
    @IsInt()
    @IsOptional()
    @Type(() => Number)
    page = 1;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    limit = 10;

    @IsInt()
    @IsOptional()
    @Min(1)
    @Max(12)
    @Type(() => Number)
    month;

    @IsInt()
    @IsOptional()
    @Min(2000)
    @Type(() => Number)
    year;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    employeeId;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    managerId;

    @IsOptional()
    @Type(() => Number)
    departmentId;

    get skip() {
        return (this.page - 1) * this.limit;
    }
}
