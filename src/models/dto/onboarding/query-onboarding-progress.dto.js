import {
  IsOptional,
  IsInt,
  IsString
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     QueryOnboardingProgressDto:
 *       allOf:
 *         - $ref: '#/components/schemas/PaginationDto'
 *         - type: object
 *           properties:
 *             employeeId:
 *               type: number
 *               description: Filter by employee ID
 *             overallStatus:
 *               type: string
 *               description: Filter by overall status
 */
export class QueryOnboardingProgressDto extends PaginationDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  employeeId;

  @IsOptional()
  @IsString()
  overallStatus;
}
