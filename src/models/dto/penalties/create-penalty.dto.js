import { IsString, IsNotEmpty, IsNumber, IsOptional, MaxLength, Min, Max } from 'class-validator';

export class CreatePenaltyDto {
    @IsString({ message: 'Tên hình phạt phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Tên hình phạt không được để trống' })
    @MaxLength(100, { message: 'Tên hình phạt không được vượt quá 100 ký tự' })
    name;

    @IsString({ message: 'Loại hình phạt phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Loại hình phạt không được để trống' })
    penaltyType;

    @IsString({ message: 'Mức độ phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Mức độ không được để trống' })
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
