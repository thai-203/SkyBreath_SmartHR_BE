import { IsString, IsNotEmpty, IsOptional, IsEmail, IsDateString, IsInt, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEmployeeDto {
    @IsInt()
    @IsOptional()
    @Type(() => Number)
    userId;

    @IsString()
    @IsOptional()
    nationalId;

    @IsDateString()
    @IsOptional()
    nationalIdIssuedDate;

    @IsString()
    @IsOptional()
    nationalIdIssuedPlace;

    @IsString()
    @IsNotEmpty()
    fullName;

    @IsDateString()
    @IsOptional()
    dateOfBirth;

    @IsString()
    @IsOptional()
    gender;

    @IsString()
    @IsOptional()
    maritalStatus;

    @IsString()
    @IsOptional()
    nationality;

    @IsString()
    @IsOptional()
    taxCode;

    @IsEmail()
    @IsOptional()
    personalEmail;

    @IsEmail()
    @IsOptional()
    companyEmail;

    @IsString()
    @IsOptional()
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

    @IsDateString()
    @IsOptional()
    joinDate;

    @IsDateString()
    @IsOptional()
    officialStartDate;

    @IsString()
    @IsOptional()
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
