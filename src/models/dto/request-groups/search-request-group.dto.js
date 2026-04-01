import { IsOptional, IsString, IsEnum, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export class SearchRequestGroupDto extends PaginationDto {
    @IsOptional()
    @IsString()
    search;

    @IsOptional()
    @IsString()
    status;
}
