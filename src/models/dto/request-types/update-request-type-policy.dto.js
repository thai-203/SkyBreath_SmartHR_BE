import { IsOptional, IsString, IsNumber, Min, IsBoolean, IsIn } from 'class-validator';

export class UpdateRequestTypePolicyDto {
    @IsOptional()
    @IsString({ message: 'Chu kỳ theo dõi phải là chuỗi ký tự' })
    @IsIn(['DAY', 'WEEK', 'MONTH', 'YEAR'], { message: 'Chu kỳ theo dõi không hợp lệ (DAY, WEEK, MONTH, YEAR)' })
    trackingCycle;

    @IsOptional()
    @IsString({ message: 'Đơn vị tính phải là chuỗi ký tự' })
    @IsIn(['DAY', 'HOUR', 'TIME'], { message: 'Đơn vị tính không hợp lệ (DAY, HOUR, TIME)' })
    unit;

    @IsOptional()
    @IsNumber({}, { message: 'Số lượng tối đa phải là số' })
    @Min(0, { message: 'Số lượng tối đa phải lớn hơn hoặc bằng 0' })
    maxQuantity;

    @IsOptional()
    @IsBoolean({ message: 'Tính công phải là kiểu boolean (true/false)' })
    isWorkedTime;

    @IsOptional()
    @IsBoolean()
    isUnlimited;
}
