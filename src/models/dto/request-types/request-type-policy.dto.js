import { IsNotEmpty, IsString, MaxLength, IsNumber, Min, IsBoolean, IsIn } from 'class-validator';

export class RequestTypePolicyDto {
    @IsString({ message: 'Chu kỳ theo dõi phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Chu kỳ theo dõi không được để trống' })
    @IsIn(['DAY', 'WEEK', 'MONTH', 'YEAR'], { message: 'Chu kỳ theo dõi không hợp lệ (DAY, WEEK, MONTH, YEAR)' })
    @MaxLength(50, { message: 'Chu kỳ theo dõi quá dài' })
    trackingCycle;

    @IsString({ message: 'Đơn vị tính phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Đơn vị tính không được để trống' })
    @IsIn(['DAY', 'HOUR', 'MINUTE', 'TIME'], { message: 'Đơn vị tính không hợp lệ (DAY, HOUR, MINUTE, TIME)' })
    @MaxLength(50, { message: 'Đơn vị tính quá dài' })
    unit;

    @IsNumber({}, { message: 'Số lượng tối đa phải là số' })
    @IsNotEmpty({ message: 'Số lượng tối đa không được để trống' })
    @Min(0, { message: 'Số lượng tối đa phải lớn hơn hoặc bằng 0' })
    maxQuantity;

    @IsBoolean({ message: 'Tính công phải là kiểu boolean (true/false)' })
    @IsNotEmpty({ message: 'Vui lòng xác định loại đơn có tính công hay không' })
    isWorkedTime;
}
