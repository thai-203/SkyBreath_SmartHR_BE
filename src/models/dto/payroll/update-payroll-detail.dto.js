import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePayrollDetailDto {
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    bonus;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    deduction;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    penalty;

    @IsString()
    @IsOptional()
    note;
}
