import { IsString, MinLength, MaxLength } from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     ChangePasswordDto:
 *       type: object
 *       required:
 *         - currentPassword
 *         - newPassword
 *       properties:
 *         currentPassword:
 *           type: string
 *           format: password
 *           description: Current password
 *           example: password123
 *         newPassword:
 *           type: string
 *           format: password
 *           description: New password (min 6 chars)
 *           example: newpassword123
 */
export class ChangePasswordDto {
    @IsString()
    @MinLength(6)
    currentPassword: string;

    @IsString()
    @MinLength(6)
    @MaxLength(50)
    newPassword: string;
}
