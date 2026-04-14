import { Router } from 'express';
import { UsersController } from '../controllers/users.controller.js';
import { validationMiddleware } from '../common/middleware/validation.middleware.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { CreateUserDto, UpdateUserDto } from '../models/dto/users/index.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';

const router = Router();
const usersController = new UsersController();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserDto'
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *   get:
 *     summary: Get all users with pagination
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page (default 10)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort field (id, username, email, fullName, status, createdAt, lastLoginTime)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *         description: Sort order
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by username, email, or fullName
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  '/',
  authMiddleware,
  permissionsMiddleware('USER_CREATE'),
  validationMiddleware(CreateUserDto),
  usersController.create,
);
router.get(
  '/',
  authMiddleware,
  permissionsMiddleware('USER_READ'),
  usersController.findAll,
);

/**
 * @swagger
 * /users/search:
 *   get:
 *     summary: Search users with advanced filters
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by username, email, or fullName
 *       - in: query
 *         name: roles
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by role names (ADMIN, MANAGER, EMPLOYEE, USER)
 *       - in: query
 *         name: statuses
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by status (ACTIVE, LOCKED, DELETED)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page (default 10)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Filtered list of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */

router.get(
  '/meta-data',
  authMiddleware,
  permissionsMiddleware('USER_READ'),
  usersController.getMetadata,
);

router.get(
  '/meta-data/public',
  authMiddleware,
  usersController.getMetadata,
);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserDto'
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *   delete:
 *     summary: Delete user (soft delete)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Cannot delete (last admin or own account)
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/:id',
  authMiddleware,
  permissionsMiddleware('USER_READ'),
  usersController.findOne,
);
router.put(
  '/:id',
  authMiddleware,
  permissionsMiddleware('USER_UPDATE'),
  validationMiddleware(UpdateUserDto),
  usersController.update,
);
router.delete(
  '/:id',
  authMiddleware,
  permissionsMiddleware('USER_DELETE'),
  usersController.remove,
);

/**
 * @swagger
 * /users/{id}/lock:
 *   patch:
 *     summary: Lock user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User account locked successfully
 *       403:
 *         description: Cannot lock (last admin or own account)
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.patch(
  '/:id/lock',
  authMiddleware,
  permissionsMiddleware('USER_LOCK'),
  usersController.lockUser,
);

/**
 * @swagger
 * /users/{id}/unlock:
 *   patch:
 *     summary: Unlock user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User account unlocked successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.patch(
  '/:id/unlock',
  authMiddleware,
  permissionsMiddleware('USER_LOCK'),
  usersController.unlockUser,
);

router.delete(
  '/:id/user-roles',
  authMiddleware,
  permissionsMiddleware('USER_ROLE_REMOVE'),
  usersController.removeUserRoles,
);

router.post(
  '/:id/reset-password',
  authMiddleware,
  permissionsMiddleware('USER_PASSWORD_RESET_FORCE'),
  usersController.resetPassword,
);
export const usersRoutes = router;
