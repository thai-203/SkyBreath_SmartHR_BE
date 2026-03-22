import {
  IsString,
  IsNotEmpty,
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
 *     CreateContractDto:
 *       type: object
 *       required:
 *         - employeeId
 *         - contractType
 *         - startDate
 *         - signedDate
 *         - contractNumber
 *         - departmentId
 *         - positionId
 *         - jobGradeId
 *       properties:
 *         employeeId:
 *           type: integer
 *           example: 4
 *         contractNumber:
 *           type: string
 *           example: "HD-0002"
 *         contractType:
 *           type: string
 *           example: "permanent"
 *         departmentId:
 *           type: integer
 *           example: 2
 *         positionId:
 *           type: integer
 *           example: 1
 *         jobGradeId:
 *           type: integer
 *           example: 9
 *         startDate:
 *           type: string
 *           format: date
 *           example: "2026-02-08"
 *         endDate:
 *           type: string
 *           format: date
 *           nullable: true
 *         signedDate:
 *           type: string
 *           format: date
 *           example: "2026-02-08"
 *         workingHours:
 *           type: number
 *           example: 40
 *         baseSalary:
 *           type: number
 *           example: 20000000
 *         performanceSalary:
 *           type: number
 *           example: 0
 *         phoneAllowance:
 *           type: number
 *           example: 0
 *         lunchAllowance:
 *           type: number
 *           example: 0
 *         fuelAllowance:
 *           type: number
 *           example: 0
 *         otherAllowance:
 *           type: number
 *           example: 0
 *         note:
 *           type: string
 *           example: ""
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *             format: binary
 */
export class CreateContractDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  employeeId;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  departmentId;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  positionId;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  jobGradeId;

  @IsString()
  @IsNotEmpty()
  contractNumber;

  @IsString()
  @IsNotEmpty()
  contractType;

  @IsDateString()
  @IsNotEmpty()
  startDate;

  @IsOptional()
  @IsDateString()
  endDate;

  @IsDateString()
  @IsNotEmpty()
  signedDate;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
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
  note;

  /**
   * FILE UPLOAD (multipart/form-data)
   * Không validate bằng class-validator
   * Multer sẽ xử lý
   */
  @IsOptional()
  @Allow()
  attachments;
}
