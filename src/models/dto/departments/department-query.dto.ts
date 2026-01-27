import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

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
 */
export class DepartmentQueryDto extends PaginationDto {
    @IsOptional()
    @IsString()
    search?: string;
}
