import { IsEmail } from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     ForgotPasswordDto:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: admin@example.com
 */
export class ForgotPasswordDto {
  @IsEmail()
  email;
}
