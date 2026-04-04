import { IsString, IsOptional, IsInt, Min, Max, IsEmail, IsPhoneNumber, IsDateString } from 'class-validator';

export class UpdatePayrollDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(12)
    payrollMonth;

    @IsOptional()
    @IsInt()
    payrollYear;

    @IsOptional()
    @IsString()
    payrollStatus;

    @IsOptional()
    @IsString()
    unitName;

    @IsOptional()
    @IsString()
    contactName;

    @IsOptional()
    @IsString()
    contactPhone;

    @IsOptional()
    @IsEmail()
    contactEmail;

    @IsOptional()
    @IsDateString()
    paymentDate;
}
