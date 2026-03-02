import { Router } from 'express';
import { Role } from '../common/enums/index.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { rolesMiddleware } from '../common/middleware/roles.middleware.js';
import { PermissionsController } from '../controllers/permissions.controller.js';
import { PermissionsRepository } from '../repositories/permissions.repository.js';
import { PermissionsService } from '../services/permissions.service.js';

const router = Router();
const permissionsRepository = new PermissionsRepository();
const permissionsService = new PermissionsService(permissionsRepository);
const permissionsController = new PermissionsController(permissionsService);

/**
 * @swagger
 * /permissions:
 *   get:
 *     summary: Get all permissions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of permissions
 */
router.get('/', authMiddleware, rolesMiddleware([Role.ADMIN]), permissionsController.findAll);
router.post('/', authMiddleware, rolesMiddleware([Role.ADMIN]), permissionsController.create);
router.put('/:id', authMiddleware, rolesMiddleware([Role.ADMIN]), permissionsController.update);
router.delete('/:id', authMiddleware, rolesMiddleware([Role.ADMIN]), permissionsController.delete);

export const permissionsRoutes = router;
