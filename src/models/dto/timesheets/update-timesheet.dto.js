import { IsOptional, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTimesheetDto {
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    totalWorkingDays;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    totalWorkingHours;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    overtimeHours;

    @IsString()
    @IsOptional()
    editReason;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    officialDays;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    probationDays;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    businessTripDays;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    holidayDays;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    paidLeaveDays;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    nightShiftOfficialDays;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    nightShiftProbationDays;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    otWeekday;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    otWeekdayNight;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    otWeekend;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    otWeekendNight;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    otHoliday;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    otHolidayNight;
}
