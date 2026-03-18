import { IsString, IsNotEmpty, IsOptional, IsNumber, MaxLength } from 'class-validator';

export class CreatePositionDto {
    @IsString({ message: 'Tên vị trí phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Tên vị trí không được để trống' })
    @MaxLength(100, { message: 'Tên vị trí không được vượt quá 100 ký tự' })
    positionName;

    @IsOptional()
    @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
    @MaxLength(500, { message: 'Mô tả không được vượt quá 500 ký tự' })
    description;

    @IsNumber({}, { message: 'ID phòng ban phải là số' })
    @IsNotEmpty({ message: 'ID phòng ban không được để trống' })
    departmentId;

}