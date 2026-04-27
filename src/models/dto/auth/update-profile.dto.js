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
  personalEmail;
  phoneNumber;
  currentAddress;
  permanentAddress;
  avatar;
}
