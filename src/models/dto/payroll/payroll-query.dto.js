import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PayrollQueryDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    page = 1;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    limit = 10;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(12)
    @IsOptional()
    month;

    @Type(() => Number)
    @IsInt()
    @IsOptional()
    year;

    @Type(() => Number)
    @IsInt()
    @IsOptional()
    departmentId;

    @IsString()
    @IsOptional()
    status;

    @IsString()
    @IsOptional()
    search;

    get skip() { return (this.page - 1) * this.limit; }
    get take() { return this.limit; }
}
