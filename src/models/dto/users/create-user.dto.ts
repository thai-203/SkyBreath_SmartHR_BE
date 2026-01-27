import {
    IsEmail,
    IsString,
    MinLength,
    MaxLength,
    IsOptional,
    IsArray,
    IsUUID,
    IsNotEmpty,
} from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateUserDto:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email
 *           example: user@example.com
 *         password:
 *           type: string
 *           format: password
 *           description: User's password
 *           example: password123
 *         firstName:
 *           type: string
 *           description: First name
 *           example: John
 *         lastName:
 *           type: string
 *           description: Last name
 *           example: Doe
 *         roleIds:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *           description: Array of Role IDs
 *           example: ["uuid-1", "uuid-2"]
 */
export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    @IsNotEmpty()
    @MaxLength(50)
    password: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    firstName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    @IsNotEmpty()
    lastName?: string;

    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    roleIds?: string[];
}
