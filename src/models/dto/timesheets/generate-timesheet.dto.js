import { IsInt, IsOptional, Min, Max, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateTimesheetDto {
    @IsInt()
    @Min(1)
    @Max(12)
    @Type(() => Number)
    month;

    @IsInt()
    @Min(2020)
    @Type(() => Number)
    year;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    departmentId;

    @IsArray()
    @IsOptional()
    @IsInt({ each: true })
    @Type(() => Number)
    employeeIds;
}
