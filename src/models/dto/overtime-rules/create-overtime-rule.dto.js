import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, MaxLength, Min, Max, ArrayNotEmpty } from 'class-validator';

export class CreateOvertimeRuleDto {
    @IsString({ message: 'Tên quy định phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Tên quy định không được để trống' })
    @MaxLength(100, { message: 'Tên quy định không được vượt quá 100 ký tự' })
    name;

    @IsNumber({}, { message: 'Hệ số lương phải là số' })
    @IsNotEmpty({ message: 'Hệ số lương không được để trống' })
    @Min(0, { message: 'Hệ số lương phải lớn hơn hoặc bằng 0' })
    @Max(99.9, { message: 'Hệ số lương không được vượt quá 99.9' })
    salaryMultiplier;

    @IsNumber({}, { message: 'Giờ OT tối đa/ngày phải là số' })
    @IsNotEmpty({ message: 'Giờ OT tối đa/ngày không được để trống' })
    @Min(1, { message: 'Giờ OT tối đa/ngày phải lớn hơn 0' })
    @Max(24, { message: 'Giờ OT tối đa/ngày không được vượt quá 24 giờ' })
    maxHoursPerDay;

    @IsNumber({}, { message: 'Giờ OT tối đa/tháng phải là số' })
    @IsNotEmpty({ message: 'Giờ OT tối đa/tháng không được để trống' })
    @Min(1, { message: 'Giờ OT tối đa/tháng phải lớn hơn 0' })
    @Max(744, { message: 'Giờ OT tối đa/tháng không được vượt quá 744 giờ' })
    maxHoursPerMonth;

    @IsArray({ message: 'Danh sách phòng ban phải là mảng' })
    @ArrayNotEmpty({ message: 'Danh sách phòng ban không được để trống' })
    departmentIds;

    @IsOptional()
    @IsString({ message: 'Trạng thái phải là chuỗi ký tự' })
    status;
}
