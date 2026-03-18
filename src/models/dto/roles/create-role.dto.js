import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
 *           description: Role name (min 2 chars)
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
export class CreateRoleDto {
    @IsString()
    @IsNotEmpty({ message: 'Tên vai trò không được để trống' })
    @MinLength(2, { message: 'Tên vai trò phải có ít nhất 2 ký tự' })
    @MaxLength(50, { message: 'Tên vai trò tối đa 50 ký tự' })
    name;

    @IsOptional()
    @IsEnum(['active', 'inactive'], { message: 'Trạng thái không hợp lệ' })
    status;

    @IsOptional()
    @IsString()
    @MaxLength(255, { message: 'Mô tả tối đa 255 ký tự' })
    description;
}
