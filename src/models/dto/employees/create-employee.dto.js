import { IsString, IsNotEmpty, IsOptional, IsEmail, IsDate, IsInt, Matches, IsIn, MaxDate, Validate } from 'class-validator';
import { Type } from 'class-transformer';
import { IsOver18 } from './over-18.validator';
export class CreateEmployeeDto {
    @IsString()
    @IsNotEmpty({ message: 'Mã nhân viên là bắt buộc' })
    @Matches(/^[A-Za-z0-9-]+$/, { message: 'Mã nhân viên chỉ được chứa chữ cái, số và dấu gạch ngang' })
    employeeCode;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    userId;

    @IsString()
    @IsOptional()
    @Matches(/^[0-9]{9,12}$/, { message: 'Số CMND/CCCD phải từ 9-12 chữ số' })
    nationalId;

    @IsDate({ message: 'Ngày cấp không hợp lệ' })
    @IsOptional()
    @Type(() => Date)
    @MaxDate(new Date(), { message: 'Ngày cấp không được ở tương lai' })
    nationalIdIssuedDate;

    @IsString()
    @IsOptional()
    nationalIdIssuedPlace;

    @IsString()
    @IsNotEmpty({ message: 'Họ tên là bắt buộc' })
    @Matches(/^[a-zA-ZÀ-ỹ\s]+$/, { message: 'Họ tên chỉ được chứa chữ cái và khoảng trắng' })
    fullName;

    @IsDate({ message: 'Ngày sinh không hợp lệ' })
    @IsOptional()
    @Type(() => Date)
    @MaxDate(new Date(), { message: 'Ngày sinh không được ở tương lai' })
    @Validate(IsOver18, { message: 'Nhân viên phải trên 18 tuổi' })  // Sử dụng validator kiểm tra tuổi
    dateOfBirth;


    @IsString()
    @IsOptional()
    @IsIn(['MALE', 'FEMALE', 'OTHER'], { message: 'Giới tính không hợp lệ' })
    gender;

    @IsString()
    @IsOptional()
    @IsIn(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'], { message: 'Tình trạng hôn nhân không hợp lệ' })
    maritalStatus;

    @IsString()
    @IsOptional()
    nationality;

    @IsString()
    @IsOptional()
    @Matches(/^[0-9]{10,13}$/, { message: 'Mã số thuế phải từ 10-13 chữ số' })
    taxCode;

    @IsEmail({}, { message: 'Email cá nhân không hợp lệ' })
    @IsOptional()
    personalEmail;

    @IsEmail({}, { message: 'Email công ty không hợp lệ' })
    @IsOptional()
    companyEmail;

    @IsString()
    @IsOptional()
    @Matches(/^0[0-9]{9,10}$/, { message: 'Số điện thoại không hợp lệ (VD: 0901234567)' })
    phoneNumber;

    @IsString()
    @IsOptional()
    educationLevel;

    @IsString()
    @IsOptional()
    permanentAddress;

    @IsString()
    @IsOptional()
    currentAddress;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    departmentId;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    positionId;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    directManagerId;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    jobGradeId;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    hrMentorId;

    @IsDate({ message: 'Ngày vào làm không hợp lệ' })
    @IsOptional()
    @Type(() => Date)
    @MaxDate(new Date(), { message: 'Ngày vào làm không được ở tương lai' })
    joinDate;

    @IsDate({ message: 'Ngày chính thức không hợp lệ' })
    @IsOptional()
    @Type(() => Date)
    @MaxDate(new Date(), { message: 'Ngày chính thức không được ở tương lai' })
    officialStartDate;

    @IsString()
    @IsOptional()
    @IsIn(['PROBATION', 'ACTIVE', 'ON_LEAVE', 'TERMINATED'], { message: 'Trạng thái không hợp lệ' })
    employmentStatus;

    @IsString()
    @IsOptional()
    frontIdCardFilePath;

    @IsString()
    @IsOptional()
    backIdCardFilePath;

    @IsString()
    @IsOptional()
    avatar;
}