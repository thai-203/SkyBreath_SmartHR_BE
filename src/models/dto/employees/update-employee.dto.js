import { IsString, IsOptional, IsEmail, IsDateString, IsInt } from 'class-validator';
import { Type, Expose } from 'class-transformer';

export class UpdateEmployeeDto {
    @Expose()
    @IsInt()
    @IsOptional()
    @Type(() => Number)
    userId;

    @Expose()
    @IsString()
    @IsOptional()
    nationalId;

    @Expose()
    @IsDateString()
    @IsOptional()
    nationalIdIssuedDate;

    @Expose()
    @IsString()
    @IsOptional()
    nationalIdIssuedPlace;

    @Expose()
    @IsString()
    @IsOptional()
    fullName;

    @Expose()
    @IsDateString()
    @IsOptional()
    dateOfBirth;

    @Expose()
    @IsString()
    @IsOptional()
    gender;

    @Expose()
    @IsString()
    @IsOptional()
    maritalStatus;

    @Expose()
    @IsString()
    @IsOptional()
    nationality;

    @Expose()
    @IsString()
    @IsOptional()
    taxCode;

    @Expose()
    @IsEmail()
    @IsOptional()
    personalEmail;

    @Expose()
    @IsEmail()
    @IsOptional()
    companyEmail;

    @Expose()
    @IsString()
    @IsOptional()
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
    @IsDateString()
    @IsOptional()
    joinDate;

    @Expose()
    @IsDateString()
    @IsOptional()
    officialStartDate;

    @Expose()
    @IsString()
    @IsOptional()
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
