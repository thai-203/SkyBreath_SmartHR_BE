import { Type } from 'class-transformer';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsArray,
  IsUUID,
  IsNotEmpty,
  IsInt,
} from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     UpdateUserDto:
 *       type: object
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
 *         roleIds:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *           description: Array of Role IDs
 *           example: ["uuid-1", "uuid-2"]
 */
export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  username;

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
