import { IsString, IsNotEmpty, IsOptional, IsInt, IsDateString, IsDecimal, Min } from 'class-validator';

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
 *         - contractStatus
 *       properties:
 *         employeeId:
 *           type: integer
 *           description: The ID of the employee
 *           example: 1
 *         contractNumber:
 *           type: string
 *           description: The contract number
 *           example: CT-2024-001
 *         contractType:
 *           type: string
 *           description: The type of contract
 *           example: Permanent
 *         startDate:
 *           type: string
 *           format: date
 *           description: Contract start date
 *           example: 2024-01-01
 *         endDate:
 *           type: string
 *           format: date
 *           description: Contract end date (optional for permanent contracts)
 *           example: 2024-12-31
 *         workingHours:
 *           type: number
 *           description: Working hours per day
 *           example: 8
 *         contractStatus:
 *           type: string
 *           description: Contract status
 *           example: Active
 *         signedDate:
 *           type: string
 *           format: date
 *           description: Date contract was signed
 *           example: 2024-01-01
 */
export class CreateContractDto {
    @IsInt()
    @Min(1)
    @IsNotEmpty()
    employeeId;

    @IsOptional()
    @IsString()
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

    @IsOptional()
    @IsDecimal()
    workingHours;

    @IsString()
    @IsNotEmpty()
    contractStatus;

    @IsOptional()
    @IsDateString()
    signedDate;
}
