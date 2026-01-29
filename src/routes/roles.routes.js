import { Router } from 'express';
import { RolesController } from '../controllers/roles.controller.js';
import { validationMiddleware } from '../common/middleware/validation.middleware.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { rolesMiddleware } from '../common/middleware/roles.middleware.js';
import { CreateRoleDto, UpdateRoleDto } from '../models/dto/roles/index.js';
import { Role } from '../common/enums/index.js';

import { RolesRepository } from '../repositories/roles.repository.js';
import { RolesService } from '../services/roles.service.js';

const router = Router();
const rolesRepository = new RolesRepository();
const rolesService = new RolesService(rolesRepository);
const rolesController = new RolesController(rolesService);

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Role management
 */

/**
 * @swagger
 * /roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRoleDto'
 *     responses:
 *       201:
 *         description: Role created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *   get:
 *     summary: Get all roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', authMiddleware, rolesMiddleware([Role.ADMIN]), validationMiddleware(CreateRoleDto), rolesController.create);
router.get('/', authMiddleware, rolesMiddleware([Role.ADMIN]), rolesController.findAll);

/**
 * @swagger
 * /roles/{id}:
 *   get:
 *     summary: Get role by ID
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role details
 *       404:
 *         description: Role not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *   put:
 *     summary: Update role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateRoleDto'
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       404:
 *         description: Role not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *   delete:
 *     summary: Delete role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       404:
 *         description: Role not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/:id', authMiddleware, rolesMiddleware([Role.ADMIN]), rolesController.findOne);
router.put('/:id', authMiddleware, rolesMiddleware([Role.ADMIN]), validationMiddleware(UpdateRoleDto), rolesController.update);
router.delete('/:id', authMiddleware, rolesMiddleware([Role.ADMIN]), rolesController.remove);

export const rolesRoutes = router;
