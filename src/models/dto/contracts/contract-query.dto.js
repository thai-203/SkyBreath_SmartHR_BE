import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * @swagger
 * components:
 *   schemas:
 *     ContractQueryDto:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           description: Page number (1-indexed)
 *           example: 1
 *         limit:
 *           type: integer
 *           description: Items per page
 *           example: 10
 *         search:
 *           type: string
 *           description: Search by employee name or contract number
 *           example: John Doe
 *         sortBy:
 *           type: string
 *           description: Sort field
 *           example: startDate
 *         sortOrder:
 *           type: string
 *           description: Sort order
 *           enum: [ASC, DESC]
 *           example: DESC
 *         contractStatus:
 *           type: string
 *           description: Filter by contract status
 *           example: Active
 *         contractType:
 *           type: string
 *           description: Filter by contract type
 *           example: Permanent
 */
export class ContractQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @IsOptional()
  @IsString()
  search;

  @IsOptional()
  @IsString()
  sortBy;

  @IsOptional()
  @IsString()
  sortOrder = 'DESC';

  @IsOptional()
  @IsString()
  contractStatus;

  @IsOptional()
  @IsString()
  contractType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  employeeId;

  get skip() {
    return (this.page - 1) * this.limit;
  }
}
