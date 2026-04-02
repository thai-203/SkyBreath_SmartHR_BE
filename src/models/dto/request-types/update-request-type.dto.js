import { IsOptional, IsString, MaxLength, ValidateNested, IsIn, IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { RequestTypePolicyDto } from './request-type-policy.dto.js';

export class UpdateRequestTypeDto {
    @IsOptional()
    @IsInt({ message: 'ID Nhóm đơn từ phải là số nguyên' })
    @IsPositive({ message: 'ID Nhóm đơn từ phải lớn hơn 0' })
    requestGroupId;

    @IsOptional()
    @IsString({ message: 'Tên loại đơn phải là chuỗi ký tự' })
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
