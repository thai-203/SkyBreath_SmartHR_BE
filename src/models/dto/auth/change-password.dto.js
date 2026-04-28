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
 *           minLength: 8
 *           description: Current password of the user
 *           example: OldPassword@123
 *         newPassword:
 *           type: string
 *           minLength: 8
 *           description: New password for the user
 *           example: NewPassword@123
 */
export class ChangePasswordDto {
  currentPassword;
  newPassword;
}
