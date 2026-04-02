import { IsOptional, IsString, MaxLength, IsArray, ValidateNested, IsIn, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { RequestGroupWorkflowDto } from './request-group-workflow.dto.js';
import { RequestGroupCode } from '../../../common/enums/request.enum.js';

export class UpdateRequestGroupDto {
    @IsOptional()
    @IsString({ message: 'Tên nhóm đơn phải là chuỗi ký tự' })
    @MaxLength(255, { message: 'Tên nhóm đơn không được vượt quá 255 ký tự' })
    name;

    @IsOptional()
    @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
    description;

    @IsOptional()
    @IsEnum(RequestGroupCode, { message: 'Mã nhóm đơn không hợp lệ' })
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
