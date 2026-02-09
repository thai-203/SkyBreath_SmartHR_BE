import { IsString, IsOptional, IsNumber, MaxLength } from 'class-validator';

export class UpdatePositionDto {
    @IsOptional()
    @IsString({ message: 'Tên vị trí phải là chuỗi ký tự' })
    @MaxLength(100, { message: 'Tên vị trí không được vượt quá 100 ký tự' })
    positionName;

    @IsOptional()
    @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
    @MaxLength(500, { message: 'Mô tả không được vượt quá 500 ký tự' })
    description;

    @IsOptional()
    @IsNumber({}, { message: 'ID phòng ban phải là số' })
    departmentId;
}