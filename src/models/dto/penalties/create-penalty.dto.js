import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsDateString,
    IsIn,
    IsInt,
    Min,
    IsNumber,
} from 'class-validator';

export class CreatePenaltyDto {
    @IsString({ message: 'Trường hợp phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Trường hợp không được để trống' })
    @IsIn(['LATE', 'EARLY'], { message: 'Trường hợp chỉ được là LATE hoặc EARLY' })
    violationType;

    @IsDateString({}, { message: 'Ngày hiệu lực không hợp lệ' })
    effectiveFrom;

    @IsOptional()
    @IsDateString({}, { message: 'Ngày hết hiệu lực không hợp lệ' })
    effectiveTo;

    @IsInt({ message: 'Thời gian từ (phút) phải là số nguyên' })
    @Min(0, { message: 'Thời gian từ (phút) phải lớn hơn hoặc bằng 0' })
    fromMinute;

    @IsInt({ message: 'Thời gian đến (phút) phải là số nguyên' })
    @Min(1, { message: 'Thời gian đến (phút) phải lớn hơn 0' })
    toMinute;

    @IsNumber({}, { message: 'Số giờ quy đổi phải là số' })
    @Min(0, { message: 'Số giờ quy đổi phải lớn hơn hoặc bằng 0' })
    convertedHours;

    @IsOptional()
    @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
    note;

    @IsOptional()
    @IsString({ message: 'Trạng thái phải là chuỗi ký tự' })
    @IsIn(['ACTIVE', 'INACTIVE'], { message: 'Trạng thái chỉ được là ACTIVE hoặc INACTIVE' })
    status;
}
