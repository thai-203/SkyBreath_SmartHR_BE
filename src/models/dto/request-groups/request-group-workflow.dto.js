import { IsInt, IsNotEmpty, IsPositive, IsString, IsBoolean, MaxLength, IsOptional, IsIn } from 'class-validator';

export class RequestGroupWorkflowDto {
    @IsOptional()
    @IsInt()
    id;

    @IsInt({ message: 'Thứ tự duyệt phải là số nguyên' })
    @IsPositive({ message: 'Thứ tự duyệt phải là số lớn hơn 0' })
    @IsNotEmpty({ message: 'Thứ tự duyệt không được để trống' })
    levelOrder;

    @IsString({ message: 'Tên cấp duyệt phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Tên cấp duyệt không được để trống' })
    @MaxLength(255, { message: 'Tên cấp duyệt không được vượt quá 255 ký tự' })
    levelName;

    @IsString({ message: 'Loại người duyệt phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Loại người duyệt không được để trống' })
    @IsIn(['DIRECT_MANAGER', 'ROLE'], { message: 'Loại người duyệt phải là DIRECT_MANAGER hoặc ROLE' })
    approverType;

    @IsOptional()
    @IsInt({ message: 'Quyền duyệt phải là số' })
    approverRoleId;

    @IsOptional()
    @IsInt({ message: 'ID người duyệt phải là số' })
    approverUserId;

    @IsOptional()
    @IsBoolean({ message: 'Cờ nhận thông báo phải là kiểu boolean' })
    notifyApprover;
}
