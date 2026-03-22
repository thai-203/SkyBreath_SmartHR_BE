import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AddEmployeeTimesheetDto {
    @IsInt()
    @Type(() => Number)
    employeeId;

    @IsInt()
    @Min(1)
    @Max(12)
    @Type(() => Number)
    month;

    @IsInt()
    @Min(2020)
    @Type(() => Number)
    year;
}
