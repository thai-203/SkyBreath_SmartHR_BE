import {
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    IsDateString,
    Min,
} from 'class-validator';

export class UpdateEmployeeSalaryDto {
    @IsOptional()
    @IsInt()
    employee_id;

    @IsOptional()
    @IsInt()
    job_grade_id;

    @IsOptional()
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

    @IsOptional()
    @IsString()
    salary_type;

    @IsOptional()
    @IsDateString()
    effective_from;

    @IsOptional()
    @IsDateString()
    effective_to;

    @IsOptional()
    @IsString()
    salary_status;
}
