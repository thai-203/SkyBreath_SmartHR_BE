import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum SortOrder {
    ASC = 'ASC',
    DESC = 'DESC',
}

export class PaginationDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @IsOptional()
    @IsString()
    sortBy?: string;

    @IsOptional()
    @IsEnum(SortOrder)
    sortOrder?: SortOrder = SortOrder.DESC;

    get skip(): number {
        return ((this.page ?? 1) - 1) * (this.limit ?? 10);
    }
}

export class PaginatedResponseDto<T> {
    data: T[];
    meta: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };

    constructor(data: T[], totalItems: number, paginationDto: PaginationDto) {
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
