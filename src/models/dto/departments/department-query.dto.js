import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     DepartmentQueryDto:
 *       allOf:
 *         - $ref: '#/components/schemas/PaginationDto'
 *         - type: object
 *           properties:
 *             search:
 *               type: string
 *               description: Search term for department name
 *               example: HR
 *             parentDepartmentId:
 *               type: integer
 *               description: Filter by parent department ID
 *             managerEmployeeId:
 *               type: integer
 *               description: Filter by manager ID
 *             hasEmployees:
 *               type: string
 *               enum: [true, false]
 *               description: Filter by whether department has employees
 */
export class DepartmentQueryDto extends PaginationDto {
    @IsOptional()
    @IsString()
    search;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    parentDepartmentId;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    managerEmployeeId;

    @IsOptional()
    @IsString()
    hasEmployees;
}
