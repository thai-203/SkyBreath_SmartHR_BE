import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     UpdatePermissionDto:
 *       type: object
 *       properties:
 *         permissionCode:
 *           type: string
 *           description: Unique permission code (uppercase, numbers, underscores)
 *           example: USER_CREATE
 *         module:
 *           type: string
 *           description: Module name
 *           example: Users
 *         description:
 *           type: string
 *           description: Permission description
 *           example: Create new users
 */
export class UpdatePermissionDto {
    @IsOptional()
    @IsString()
    @MinLength(3, { message: 'Mã quyền phải có ít nhất 3 ký tự' })
    @MaxLength(100, { message: 'Mã quyền tối đa 100 ký tự' })
    @Matches(/^[A-Z0-9_]+$/, { message: 'Mã quyền chỉ được chứa chữ hoa, số và dấu gạch dưới' })
    permissionCode;

    @IsOptional()
    @IsString()
    @MinLength(2, { message: 'Phân hệ phải có ít nhất 2 ký tự' })
    @MaxLength(50, { message: 'Phân hệ tối đa 50 ký tự' })
    module;

    @IsOptional()
    @IsString()
    @MaxLength(255, { message: 'Mô tả tối đa 255 ký tự' })
    description;
}
