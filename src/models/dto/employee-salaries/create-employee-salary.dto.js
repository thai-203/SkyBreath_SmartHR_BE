import {
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    IsDateString,
    Min,
} from 'class-validator';

export class CreateEmployeeSalaryDto {
    @IsInt()
    employee_id;

    @IsInt()
    job_grade_id;

    @IsNumber()
    @Min(0)
    base_salary;

    @IsOptional()
    @IsNumber()
    @Min(0)
    performance_salary;

    @IsOptional()
    @IsNumber()
    @Min(0)
    lunch_allowance;

    @IsOptional()
    @IsNumber()
    @Min(0)
    fuel_allowance;

    @IsOptional()
    @IsNumber()
    @Min(0)
    phone_allowance;

    @IsOptional()
    @IsNumber()
    @Min(0)
    other_allowance;

    @IsString()
    salary_type;

    @IsDateString()
    effective_from;

    @IsOptional()
    @IsDateString()
    effective_to;

    @IsString()
    salary_status;
}
