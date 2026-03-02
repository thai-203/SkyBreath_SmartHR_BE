import { IsEmail, IsOptional, IsString } from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     UpdateProfileDto:
 *       type: object
 *       properties:
 *         personalEmail:
 *           type: string
 *           format: email
 *         phoneNumber:
 *           type: string
 *         currentAddress:
 *           type: string
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullName;

  @IsOptional()
  @IsEmail()
  personalEmail;

  @IsOptional()
  @IsString()
  phoneNumber;

  @IsOptional()
  @IsString()
  currentAddress;
}
