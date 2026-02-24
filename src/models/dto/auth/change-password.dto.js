import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

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
 *           description: New password (min 8 chars, includes upper, lower, number, special)
 *           example: NewPassword@123
 */
export class ChangePasswordDto {
  @IsString()
  @MinLength(6, { message: 'Mật khẩu hiện tại phải có ít nhất 6 ký tự' })
  currentPassword;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @MaxLength(50, { message: 'Mật khẩu không được vượt quá 50 ký tự' })
  @Matches(/[A-Z]/, { message: 'Mật khẩu phải có ít nhất 1 chữ hoa' })
  @Matches(/[a-z]/, { message: 'Mật khẩu phải có ít nhất 1 chữ thường' })
  @Matches(/\d/, { message: 'Mật khẩu phải có ít nhất 1 chữ số' })
  @Matches(/[!@#$%^&*(),.?":{}|<>]/, {
    message: 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt',
  })
  newPassword;
}
