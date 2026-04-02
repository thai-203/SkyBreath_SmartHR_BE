import { IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested, IsIn, IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { RequestTypePolicyDto } from './request-type-policy.dto.js';

export class CreateRequestTypeDto {
    @IsInt({ message: 'ID Nhóm đơn từ phải là số nguyên' })
    @IsPositive({ message: 'ID Nhóm đơn từ phải lớn hơn 0' })
    @IsNotEmpty({ message: 'Nhóm đơn từ không được bỏ trống' })
    requestGroupId;

    @IsString({ message: 'Tên loại đơn phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Tên loại đơn không được để trống' })
    @MaxLength(255, { message: 'Tên loại đơn không được vượt quá 255 ký tự' })
    name;

    @IsOptional()
    @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
    description;

    @IsOptional()
    @IsIn(['ACTIVE', 'INACTIVE'], { message: 'Trạng thái không hợp lệ' })
    status;

    @IsOptional()
    @ValidateNested()
    @Type(() => RequestTypePolicyDto)
    policy;
}
