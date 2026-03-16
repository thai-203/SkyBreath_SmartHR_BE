import { IsOptional, IsString, IsInt } from 'class-validator';

export class UpdatePayrollTypeDto {
    @IsOptional()
    @IsString()
    payrollTypeCode;

    @IsOptional()
    @IsString()
    name;

    @IsOptional()
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
