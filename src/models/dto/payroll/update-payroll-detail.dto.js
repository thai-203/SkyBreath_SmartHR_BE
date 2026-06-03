import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePayrollDetailDto {
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    standardDays;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    workingDays;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    officialDays;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    probationDays;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    businessTripDays;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    holidayDays;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    benefitLeaveDays;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    annualLeaveDays;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    unpaidLeaveDays;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    nightShiftOfficialDays;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    nightShiftProbationDays;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    waitingDays;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    otWeekday;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    otWeekdayNight;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    otWeekend;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    otWeekendNight;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    otHoliday;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    otHolidayNight;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    totalOtHours;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    bonus;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    penalty;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    otherDeduction;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    unionFee;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    socialInsurancePercentage;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    healthInsurancePercentage;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    unemploymentInsurancePercentage;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    insuranceAdjustment;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    employeeUnionFee;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    partyFee;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    familyDeduction;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    taxAdjustment;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    adjustmentTaxable;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    adjustmentNonTaxable;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    otherNonTaxable;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    taxDeduction;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    dependentCount;

    @IsString()
    @IsOptional()
    note;
}
