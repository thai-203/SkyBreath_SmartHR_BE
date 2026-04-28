import { IsEmail, IsString } from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginDto:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: admin@example.com
 *         password:
 *           type: string
 *           format: password
 *           description: User's password
 *           example: password123
 */
export class LoginDto {
  @IsEmail()
  email;

  @IsString()
  password;
}
