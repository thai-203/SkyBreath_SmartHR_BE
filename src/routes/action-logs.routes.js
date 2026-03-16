import { Router } from 'express';
import { ActionLogsController } from '../controllers/action-logs.controller.js';
import { validationMiddleware } from '../common/middleware/validation.middleware.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { rolesMiddleware } from '../common/middleware/roles.middleware.js';
import { Role } from '../common/enums/index.js';
import { ActionLogQueryDto } from '../models/dto/action-logs/action-log-query.dto.js';

const router = Router();
const actionLogsController = new ActionLogsController();

/**
 * @swagger
 * tags:
 *   name: ActionLogs
 *   description: Action Log management
 */

/**
 * @swagger
 * /action-logs:
 *   get:
 *     summary: Get all action logs
 *     tags: [ActionLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: actionType
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: targetTable
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: List of action logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ActionLogResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *
 * /action-logs/{id}:
 *   get:
 *     summary: Get action log by ID
 *     tags: [ActionLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Action log ID
 *     responses:
 *       200:
 *         description: Action log details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActionLogResponse'
 *       404:
 *         description: Not found
 */

router.get(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  actionLogsController.findAll,
);
router.get(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  actionLogsController.findOne,
);

router.get(
  '/export/excel',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  (req, res, next) => actionLogsController.export(req, res, next)
);

export const actionLogsRoutes = router;
