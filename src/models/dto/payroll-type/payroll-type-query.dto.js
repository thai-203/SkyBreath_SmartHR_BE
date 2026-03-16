import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class PayrollTypeQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    page = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    limit = 10;

    @IsOptional()
    @IsString()
    search;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    departmentId;
}
