import { Router } from 'express';
import { ActionLogsController } from '../controllers/action-logs.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';
import { Role } from '../common/enums/index.js';
import { rolesMiddleware } from '../common/middleware/roles.middleware.js';
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

const actionLogReaderRoles = [Role.ADMIN, 'HR'];

router.get(
  '/',
  authMiddleware,
  rolesMiddleware(actionLogReaderRoles),
  permissionsMiddleware('USER_ACTION_LOG_READ'),
  actionLogsController.findAll,
);

router.get(
  '/timesheet',
  authMiddleware,
  permissionsMiddleware('TIMESHEET_READ'),
  actionLogsController.findAll,
);

router.get(
  '/export/excel',
  authMiddleware,
  rolesMiddleware(actionLogReaderRoles),
  (req, res, next) => actionLogsController.export(req, res, next),
);
router.get(
  '/:id',
  authMiddleware,
  rolesMiddleware(actionLogReaderRoles),
  permissionsMiddleware('USER_ACTION_LOG_READ'),
  actionLogsController.findOne,
);

router.get(
  '/export/excel',
  authMiddleware,
  permissionsMiddleware('USER_ACTION_LOG_EXPORT'),
  (req, res, next) => actionLogsController.export(req, res, next),
);

router.get(
  '/timesheet/export/excel',
  authMiddleware,
  permissionsMiddleware('TIMESHEET_EXPORT'),
  (req, res, next) => actionLogsController.export(req, res, next),
);

export const actionLogsRoutes = router;
