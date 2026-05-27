import { IsString, IsOptional, IsEmail, IsDate, IsInt, Matches, IsIn, MaxDate, IsNotEmpty } from 'class-validator';
import { Type, Expose } from 'class-transformer';

export class UpdateEmployeeDto {
    @Expose()
    @IsString()
    @IsOptional()
    @Matches(/^[A-Za-z0-9.-]+$/, { message: 'Mã nhân viên chỉ được chứa chữ cái, số, dấu gạch ngang và dấu chấm' })
    employeeCode;

    @Expose()
    @IsInt()
    @IsOptional()
    @Type(() => Number)
    userId;

    @Expose()
    @IsString()
    @IsOptional()
    @Matches(/^[0-9]{9,12}$/, { message: 'Số CMND/CCCD phải từ 9-12 chữ số' })
    nationalId;

    @Expose()
    @IsDate({ message: 'Ngày cấp không hợp lệ' })
    @IsOptional()
    @Type(() => Date)
    @MaxDate(new Date(), { message: 'Ngày cấp không được ở tương lai' })
    nationalIdIssuedDate;

    @Expose()
    @IsString()
    @IsOptional()
    nationalIdIssuedPlace;

    @Expose()
    @IsString()
    @IsOptional()
    @Matches(/^[a-zA-ZÀ-ỹ\s]+$/, { message: 'Họ tên chỉ được chứa chữ cái và khoảng trắng' })
    fullName;

    @Expose()
    @IsDate({ message: 'Ngày sinh không hợp lệ' })
    @IsOptional()
    @Type(() => Date)
    @MaxDate(new Date(), { message: 'Ngày sinh không được ở tương lai' })
    dateOfBirth;

    @Expose()
    @IsString()
    @IsOptional()
    @IsIn(['MALE', 'FEMALE', 'OTHER'], { message: 'Giới tính không hợp lệ' })
    gender;

    @Expose()
    @IsString()
    @IsOptional()
    @IsIn(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'], { message: 'Tình trạng hôn nhân không hợp lệ' })
    maritalStatus;

    @Expose()
    @IsString()
    @IsOptional()
    nationality;

    @Expose()
    @IsString()
    @IsOptional()
    @Matches(/^[0-9]{10,13}$/, { message: 'Mã số thuế phải từ 10-13 chữ số' })
    taxCode;

    @Expose()
    @IsEmail({}, { message: 'Email cá nhân không hợp lệ' })
    @IsNotEmpty({ message: 'Email cá nhân không được để trống' })
    @IsOptional()
    personalEmail;

    @Expose()
    @IsEmail({}, { message: 'Email công ty không hợp lệ' })
    @IsNotEmpty({ message: 'Email công ty không được để trống' })
    @IsOptional()
    companyEmail;

    @Expose()
    @IsString()
    @IsOptional()
    @Matches(/^0[0-9]{9,10}$/, { message: 'Số điện thoại không hợp lệ (VD: 0901234567)' })
    phoneNumber;

    @Expose()
    @IsString()
    @IsOptional()
    educationLevel;

    @Expose()
    @IsString()
    @IsOptional()
    permanentAddress;

    @Expose()
    @IsString()
    @IsOptional()
    currentAddress;

    @Expose()
    @IsInt()
    @IsOptional()
    @Type(() => Number)
    departmentId;

    @Expose()
    @IsInt()
    @IsOptional()
    @Type(() => Number)
    positionId;

    @Expose()
    @IsInt()
    @IsOptional()
    @Type(() => Number)
    directManagerId;

    @Expose()
    @IsInt()
    @IsOptional()
    @Type(() => Number)
    jobGradeId;

    @Expose()
    @IsInt()
    @IsOptional()
    @Type(() => Number)
    hrMentorId;

    @Expose()
    @IsDate({ message: 'Ngày vào làm không hợp lệ' })
    @IsOptional()
    @Type(() => Date)
    joinDate;

    @Expose()
    @IsDate({ message: 'Ngày chính thức không hợp lệ' })
    @IsOptional()
    @Type(() => Date)
    officialStartDate;

    @Expose()
    @IsString()
    @IsOptional()
    @IsIn(['PROBATION', 'ACTIVE', 'ON_LEAVE', 'TERMINATED'], { message: 'Trạng thái không hợp lệ' })
    employmentStatus;

    @Expose()
    @IsString()
    @IsOptional()
    frontIdCardFilePath;

    @Expose()
    @IsString()
    @IsOptional()
    backIdCardFilePath;

    @Expose()
    @IsString()
    @IsOptional()
    avatar;
}
