import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateRoleDto:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           description: Role name
 *           example: Admin
 *         description:
 *           type: string
 *           description: Role description
 *           example: Administrator role
 */
export class CreateRoleDto {
    @IsString()
    @MaxLength(50)
    name: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    description?: string;
}
