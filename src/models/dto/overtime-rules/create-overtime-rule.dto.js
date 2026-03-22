import {
    IsString, IsNotEmpty, IsNumber, IsOptional,
    IsArray, MaxLength, Min, Max, ArrayNotEmpty,
    IsEnum, IsDateString, Matches, IsInt, IsPositive,
} from 'class-validator';

const VersionStatusEnum = ['DRAFT', 'ACTIVE', 'EXPIRED'];

export class CreateOvertimeRuleDto {
    @IsString({ message: 'Tên quy định phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Tên quy định không được để trống' })
    @MaxLength(200, { message: 'Tên quy định không được vượt quá 200 ký tự' })
    name;

    @IsInt({ message: 'overtimeTypeId phải là số nguyên' })
    @IsPositive({ message: 'overtimeTypeId phải lớn hơn 0' })
    @IsNotEmpty({ message: 'Loại OT không được để trống' })
    overtimeTypeId;

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

    @IsOptional()
    @IsDateString({}, { message: 'Ngày hiệu lực phải là định dạng YYYY-MM-DD' })
    effectiveFrom;

    @IsOptional()
    @IsDateString({}, { message: 'Ngày hết hiệu lực phải là định dạng YYYY-MM-DD' })
    effectiveTo;

    @IsOptional()
    @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
    @MaxLength(500, { message: 'Ghi chú không được vượt quá 500 ký tự' })
    note;

    @IsOptional()
    @IsEnum(VersionStatusEnum, { message: 'Trạng thái phiên bản phải là DRAFT, ACTIVE hoặc EXPIRED' })
    versionStatus;

    @IsArray({ message: 'Danh sách phòng ban phải là mảng' })
    @ArrayNotEmpty({ message: 'Danh sách phòng ban không được để trống' })
    departmentIds;
}
