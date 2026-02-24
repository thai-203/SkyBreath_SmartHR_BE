import {
  IsOptional,
  IsInt,
  IsBoolean,
  IsString
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     QueryOnboardingPlanDto:
 *       allOf:
 *         - $ref: '#/components/schemas/PaginationDto'
 *         - type: object
 *           properties:
 *             departmentId:
 *               type: number
 *               description: Filter by department ID
 *             positionId:
 *               type: number
 *               description: Filter by position ID
 *             isTemplate:
 *               type: boolean
 *               description: Filter by template status
 *             keyword:
 *               type: string
 *               description: Search keyword for plan name
 */
export class QueryOnboardingPlanDto extends PaginationDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  departmentId;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  positionId;

  @IsOptional()
  @IsBoolean()
  isTemplate;

  @IsOptional()
  @IsString()
  keyword;
}
