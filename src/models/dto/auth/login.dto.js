import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

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
  @MinLength(8)
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'Password must contain at least 1 uppercase, 1 lowercase, 1 number and 1 special character',
  })
  password;
}
