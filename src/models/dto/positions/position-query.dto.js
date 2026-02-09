import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryPositionDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit = 10;

    @IsOptional()
    @IsString()
    search = '';

    @IsOptional()
    @IsString()
    sortBy = 'createdAt';

    @IsOptional()
    @IsString()
    sortOrder = 'DESC';
}