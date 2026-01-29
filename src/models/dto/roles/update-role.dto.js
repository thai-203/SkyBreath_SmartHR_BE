import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     UpdateRoleDto:
 *       type: object
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
export class UpdateRoleDto {
    @IsOptional()
    @IsString()
    @MaxLength(50)
    name;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    description;
}
