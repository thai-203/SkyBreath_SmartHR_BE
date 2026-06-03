import { IsOptional, IsInt, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class DepartmentTransferQueryDto {
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(1)
    page = 1;

    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(1)
    limit = 10;

    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    fromDepartmentId;

    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    toDepartmentId;

    @IsOptional()
    @IsString()
    search;

    get skip() {
        return (this.page - 1) * this.limit;
    }
}
