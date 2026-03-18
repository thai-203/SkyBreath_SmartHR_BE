import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

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
 *           pattern: '^\\(\+84|0)(3|5|7|8|9)\\d{8}$'
 *         currentAddress:
 *           type: string
 *           maxLength: 500
 *         permanentAddress:
 *           type: string
 *           maxLength: 500
 *         avatar:
 *           type: string
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  personalEmail;

  @IsOptional()
  @IsString()
  @Matches(/^(\+84|0)(3|5|7|8|9)\d{8}$/, {
    message: 'Invalid Vietnamese phone number format. Use 0xxxxxxxxx or +84xxxxxxxxx',
  })
  phoneNumber;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Address must not exceed 500 characters' })
  currentAddress;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Address must not exceed 500 characters' })
  permanentAddress;

  @IsOptional()
  @IsString()
  avatar;
}
