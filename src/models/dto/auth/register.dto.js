import {
    IsEmail,
    IsString,
    MinLength,
    MaxLength,
    IsOptional,
    IsNotEmpty,
} from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterDto:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: newuser@example.com
 *         password:
 *           type: string
 *           format: password
 *           description: User's password (min 6 chars)
 *           example: password123
 *         firstName:
 *           type: string
 *           description: User's first name
 *           example: John
 *         lastName:
 *           type: string
 *           description: User's last name
 *           example: Doe
 */
export class RegisterDto {
    @IsEmail()
    email;

    @IsString()
    @MinLength(6)
    @MaxLength(50)
    password;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    firstName;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    lastName;
}
