import { IsString, MinLength, IsNotEmpty } from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     ResetPasswordDto:
 *       type: object
 *       required:
 *         - token
 *         - newPassword
 *       properties:
 *         token:
 *           type: string
 *           description: Reset password token sent via email
 *           example: 4082fd279ad06b571fb0dd4e16b61bfb6376edec69384aa9242634117d02f392
 *         newPassword:
 *           type: string
 *           minLength: 6
 *           description: New password for the user
 *           example: NewPassword@123
 */
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword;
}
