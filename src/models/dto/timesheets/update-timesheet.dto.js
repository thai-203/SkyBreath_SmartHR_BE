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
}
