import { IsString, IsOptional, IsDateString, IsDecimal } from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     UpdateContractDto:
 *       type: object
 *       properties:
 *         contractType:
 *           type: string
 *           description: The type of contract
 *           example: Permanent
 *         endDate:
 *           type: string
 *           format: date
 *           description: Contract end date
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
export class UpdateContractDto {
    @IsOptional()
    @IsString()
    contractType;

    @IsOptional()
    @IsDateString()
    endDate;

    @IsOptional()
    @IsDecimal()
    workingHours;

    @IsOptional()
    @IsString()
    contractStatus;

    @IsOptional()
    @IsDateString()
    signedDate;
}
