import { IsString, IsOptional, IsNumber, IsArray, MaxLength, Min } from 'class-validator';

export class UpdateOvertimeRuleDto {
    @IsOptional()
    @IsString({ message: 'Tên quy định phải là chuỗi ký tự' })
    @MaxLength(100, { message: 'Tên quy định không được vượt quá 100 ký tự' })
    name;

    @IsOptional()
    @IsNumber({}, { message: 'Hệ số lương phải là số' })
    @Min(0, { message: 'Hệ số lương phải lớn hơn hoặc bằng 0' })
    salaryMultiplier;

    @IsOptional()
    @IsNumber({}, { message: 'Giờ OT tối đa/ngày phải là số' })
    @Min(1, { message: 'Giờ OT tối đa/ngày phải lớn hơn 0' })
    maxHoursPerDay;

    @IsOptional()
    @IsNumber({}, { message: 'Giờ OT tối đa/tháng phải là số' })
    @Min(1, { message: 'Giờ OT tối đa/tháng phải lớn hơn 0' })
    maxHoursPerMonth;

    @IsOptional()
    @IsArray({ message: 'Danh sách phòng ban phải là mảng' })
    departmentIds;

    @IsOptional()
    @IsString({ message: 'Trạng thái phải là chuỗi ký tự' })
    status;
}
