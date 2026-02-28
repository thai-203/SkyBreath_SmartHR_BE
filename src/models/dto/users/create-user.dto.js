import { Type } from 'class-transformer';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsArray,
  IsNotEmpty,
  IsInt,
  Matches,
} from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateUserDto:
 *       type: object
 *       required:
 *         - email
 *         - username
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email
 *           example: user@example.com
 *         username:
 *           type: string
 *           description: Username
 *           example: john_doe
 *         password:
 *           type: string
 *           format: password
 *           description: User's password
 *           example: password123
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
  email;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  username;

  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'Password must contain at least 1 uppercase, 1 lowercase, 1 number and 1 special character',
  })
  password;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number) // QUAN TRỌNG
  roleIds;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status;
}
