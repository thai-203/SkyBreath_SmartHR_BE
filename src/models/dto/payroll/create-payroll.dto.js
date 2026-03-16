import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePayrollDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(12)
    payrollMonth;

    @Type(() => Number)
    @IsInt()
    @Min(2000)
    payrollYear;
}
