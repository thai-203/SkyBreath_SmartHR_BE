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
 *             type: integer
 *           description: Array of Role IDs
 *           example: [1, 2]
 *         status:
 *           type: string
 *           maxLength: 20
 *           description: User status
 *           example: ACTIVE
 */
export class CreateUserDto {
  email;
  username;
  password;
  roleIds;
  status;
}
