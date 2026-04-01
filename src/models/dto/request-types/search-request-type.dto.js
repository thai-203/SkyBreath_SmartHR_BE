import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export class SearchRequestTypeDto extends PaginationDto {
    @IsOptional()
    @IsString()
    search;

    @IsOptional()
    @IsString()
    status;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    requestGroupId;
}
