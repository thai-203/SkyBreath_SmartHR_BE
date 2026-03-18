import { IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';

export class CreatePayrollTypeDto {
    @IsNotEmpty()
    @IsString()
    payrollTypeCode;

    @IsNotEmpty()
    @IsString()
    name;

    @IsNotEmpty()
    @IsString()
    keyword;

    @IsOptional()
    @IsString()
    description;

    @IsOptional()
    @IsInt()
    departmentId;

    @IsOptional()
    @IsInt()
    positionId;
}
