import {
    IsString, IsOptional, IsNumber, IsArray, MaxLength,
    Min, Max, IsEnum, IsDateString, Matches, IsInt, IsPositive,
} from 'class-validator';

const VersionStatusEnum = ['DRAFT', 'ACTIVE', 'EXPIRED'];

export class UpdateOvertimeRuleDto {
    @IsOptional()
    @IsString({ message: 'Tên quy định phải là chuỗi ký tự' })
    @MaxLength(200)
    name;

    @IsOptional()
    @IsInt({ message: 'overtimeTypeId phải là số nguyên' })
    @IsPositive({ message: 'overtimeTypeId phải lớn hơn 0' })
    overtimeTypeId;

    @IsOptional()
    @IsNumber({}, { message: 'Hệ số lương phải là số' })
    @Min(0)
    @Max(99.9)
    salaryMultiplier;

    @IsOptional()
    @IsNumber({}, { message: 'Giờ OT tối đa/ngày phải là số' })
    @Min(1)
    @Max(24)
    maxHoursPerDay;

    @IsOptional()
    @IsNumber({}, { message: 'Giờ OT tối đa/tháng phải là số' })
    @Min(1)
    @Max(744)
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

    @IsOptional()
    @IsArray({ message: 'Danh sách phòng ban phải là mảng' })
    departmentIds;
}
