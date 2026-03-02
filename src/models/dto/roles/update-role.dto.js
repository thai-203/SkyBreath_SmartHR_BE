import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
 *         status:
 *           type: string
 *           description: Role status
 *           enum: [active, inactive]
 *           example: active
 */
export class UpdateRoleDto {
    @IsOptional()
    @IsString()
    @MinLength(2, { message: 'Tên vai trò phải có ít nhất 2 ký tự' })
    @MaxLength(50, { message: 'Tên vai trò tối đa 50 ký tự' })
    name;

    @IsOptional()
    @IsString()
    @MaxLength(255, { message: 'Mô tả tối đa 255 ký tự' })
    description;

    @IsOptional()
    @IsEnum(['active', 'inactive'], { message: 'Trạng thái không hợp lệ' })
    status;
}
