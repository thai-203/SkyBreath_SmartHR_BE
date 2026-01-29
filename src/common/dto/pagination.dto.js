import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export const SortOrder = {
    ASC: 'ASC',
    DESC: 'DESC',
};

export class PaginationDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit = 10;

    @IsOptional()
    @IsString()
    sortBy;

    @IsOptional()
    @IsEnum(SortOrder)
    sortOrder = SortOrder.DESC;

    get skip() {
        return ((this.page ?? 1) - 1) * (this.limit ?? 10);
    }
}

export class PaginatedResponseDto {
    constructor(data, totalItems, paginationDto) {
        const page = paginationDto.page ?? 1;
        const limit = paginationDto.limit ?? 10;
        const totalPages = Math.ceil(totalItems / limit);

        this.data = data;
        this.meta = {
            page,
            limit,
            totalItems,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        };
    }
}
