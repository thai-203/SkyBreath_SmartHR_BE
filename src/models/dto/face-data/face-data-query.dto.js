import { IsOptional, IsString, IsInt, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class FaceDataQueryDto {
    @IsInt()
    @IsOptional()
    @Type(() => Number)
    page = 1;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    limit = 10;

    @IsString()
    @IsOptional()
    search;

    @IsString()
    @IsOptional()
    sortBy;

    @IsString()
    @IsOptional()
    sortOrder = 'DESC';

    get skip() {
        return (this.page - 1) * this.limit;
    }
}
