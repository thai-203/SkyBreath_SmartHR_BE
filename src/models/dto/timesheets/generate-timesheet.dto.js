import { IsInt, IsOptional, Min, Max, IsArray, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

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

    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true')
    regenerate;
}
