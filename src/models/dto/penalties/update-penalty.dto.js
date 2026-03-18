import { IsString, IsOptional, IsNumber, MaxLength, Min, Max } from 'class-validator';

export class UpdatePenaltyDto {
    @IsOptional()
    @IsString({ message: 'Tên hình phạt phải là chuỗi ký tự' })
    @MaxLength(100, { message: 'Tên hình phạt không được vượt quá 100 ký tự' })
    name;

    @IsOptional()
    @IsString({ message: 'Loại hình phạt phải là chuỗi ký tự' })
    penaltyType;

    @IsOptional()
    @IsString({ message: 'Mức độ phải là chuỗi ký tự' })
    severityLevel;

    @IsOptional()
    @IsNumber({}, { message: 'Số tiền trừ phải là số' })
    @Min(0, { message: 'Số tiền trừ phải lớn hơn hoặc bằng 0' })
    deductionAmount;

    @IsOptional()
    @IsNumber({}, { message: 'Phần trăm trừ phải là số' })
    @Min(0, { message: 'Phần trăm trừ phải lớn hơn hoặc bằng 0' })
    @Max(100, { message: 'Phần trăm trừ không được vượt quá 100' })
    deductionPercentage;

    @IsOptional()
    @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
    description;

    @IsOptional()
    @IsString({ message: 'Trạng thái phải là chuỗi ký tự' })
    status;
}
