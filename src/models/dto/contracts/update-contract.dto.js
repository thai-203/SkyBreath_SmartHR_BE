import {
    IsString,
    IsOptional,
    IsInt,
    IsDateString,
    IsNumber,
    Min,
    Allow,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * @swagger
 * components:
 *   schemas:
 *     UpdateContractDto:
 *       type: object
 *       properties:
 *         contractNumber:
 *           type: string
 *         contractType:
 *           type: string
 *         departmentId:
 *           type: integer
 *         positionId:
 *           type: integer
 *         jobGradeId:
 *           type: integer
 *         startDate:
 *           type: string
 *           format: date
 *         endDate:
 *           type: string
 *           format: date
 *         signedDate:
 *           type: string
 *           format: date
 *         workingHours:
 *           type: number
 *         baseSalary:
 *           type: number
 *         performanceSalary:
 *           type: number
 *         phoneAllowance:
 *           type: number
 *         lunchAllowance:
 *           type: number
 *         fuelAllowance:
 *           type: number
 *         otherAllowance:
 *           type: number
 *         contractStatus:
 *           type: string
 *           example: active | terminated
 *         terminationDate:
 *           type: string
 *           format: date
 *         terminationReason:
 *           type: string
 *         terminationCompensation:
 *           type: number
 *         terminationNote:
 *           type: string
 *         note:
 *           type: string
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *             format: binary
 */
export class UpdateContractDto {

    /* ========= EXISTING FIELDS ========= */

    @IsOptional()
    @IsString()
    contractNumber;

    @IsOptional()
    @IsString()
    contractType;

    @Type(() => Number)
    @IsOptional()
    @IsInt()
    @Min(1)
    departmentId;

    @Type(() => Number)
    @IsOptional()
    @IsInt()
    @Min(1)
    positionId;

    @Type(() => Number)
    @IsOptional()
    @IsInt()
    @Min(1)
    jobGradeId;

    @IsOptional()
    @IsDateString()
    startDate;

    @IsOptional()
    @IsDateString()
    endDate;

    @IsOptional()
    @IsDateString()
    signedDate;

    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    @Min(0)
    workingHours;

    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    @Min(0)
    baseSalary;

    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    @Min(0)
    performanceSalary;

    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    @Min(0)
    phoneAllowance;

    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    @Min(0)
    lunchAllowance;

    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    @Min(0)
    fuelAllowance;

    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    @Min(0)
    otherAllowance;

    @IsOptional()
    @IsString()
    contractStatus;

    @IsOptional()
    @IsString()
    note;

    /* ========= TERMINATION FIELDS ========= */

    @IsOptional()
    @IsDateString()
    terminationDate;

    @IsOptional()
    @IsString()
    terminationReason;

    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    @Min(0)
    terminationCompensation;

    @IsOptional()
    @IsString()
    terminationNote;

    /**
     * FILE UPLOAD (multipart/form-data)
     */
    @IsOptional()
    @Allow()
    attachments;
}
