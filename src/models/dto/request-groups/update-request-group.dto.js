import { IsOptional, IsString, MaxLength, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { RequestGroupWorkflowDto } from './request-group-workflow.dto.js';

export class UpdateRequestGroupDto {
    @IsOptional()
    @IsString({ message: 'Tên nhóm đơn phải là chuỗi ký tự' })
    @MaxLength(255, { message: 'Tên nhóm đơn không được vượt quá 255 ký tự' })
    name;

    @IsOptional()
    @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
    description;

    @IsOptional()
    @IsString({ message: 'Mã nhóm đơn phải là chuỗi ký tự' })
    @MaxLength(100, { message: 'Mã nhóm đơn không được vượt quá 100 ký tự' })
    code;

    @IsOptional()
    @IsIn(['ACTIVE', 'INACTIVE'], { message: 'Trạng thái không hợp lệ' })
    status;

    @IsOptional()
    @IsArray({ message: 'Danh sách cấu hình duyệt phải là mảng' })
    @ValidateNested({ each: true })
    @Type(() => RequestGroupWorkflowDto)
    workflows;
}
