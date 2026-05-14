/**
 * @swagger
 * components:
 *   schemas:
 *     ResetPasswordOtpDto:
 *       type: object
 *       required:
 *         - otpRequestId
 *         - otp
 *         - newPassword
 *       properties:
 *         otpRequestId:
 *           type: string
 *           description: OTP request ID from email
 *           example: 550e8400-e29b-41d4-a716-446655440000
 *         otp:
 *           type: string
 *           description: 6-digit OTP from email
 *           example: 123456
 *         newPassword:
 *           type: string
 *           minLength: 8
 *           description: New password for the user
 *           example: NewPassword@123
 */
export class ResetPasswordOtpDto {
  otpRequestId;
  otp;
  newPassword;
}
