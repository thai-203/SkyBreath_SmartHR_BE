import { IsOptional, IsString, IsInt, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class TimesheetQueryDto {
    @IsInt()
    @IsOptional()
    @Type(() => Number)
    page = 1;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    limit = 10;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    month;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    year;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    departmentId;

    @IsString()
    @IsOptional()
    @IsIn(['locked', 'unlocked'])
    status;

    @IsString()
    @IsOptional()
    search;

    get skip() {
        return (this.page - 1) * this.limit;
    }
}
