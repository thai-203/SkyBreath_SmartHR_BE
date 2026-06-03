import { Router } from 'express';
import { DepartmentTransfersController } from '../controllers/department-transfers.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';
import { validationMiddleware } from '../common/middleware/validation.middleware.js';
import { CreateDepartmentTransferDto } from '../models/dto/department-transfers/index.js';

const router = Router();
const controller = new DepartmentTransfersController();

/**
 * @swagger
 * tags:
 *   name: DepartmentTransfers
 *   description: Department transfer management
 */

/**
 * @swagger
 * /department-transfers:
 *   post:
 *     summary: Bulk transfer employees between departments
 *     tags: [DepartmentTransfers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDepartmentTransferDto'
 *     responses:
 *       201:
 *         description: Transferred successfully
 *       400:
 *         description: Validation error or invalid transfer request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *   get:
 *     summary: Get transfer history
 *     tags: [DepartmentTransfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by transfer code or reason
 *       - in: query
 *         name: fromDepartmentId
 *         schema:
 *           type: integer
 *         description: Filter by source department
 *       - in: query
 *         name: toDepartmentId
 *         schema:
 *           type: integer
 *         description: Filter by destination department
 *     responses:
 *       200:
 *         description: List of transfers
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
    '/',
    authMiddleware,
    permissionsMiddleware('DEPARTMENT_UPDATE'),
    validationMiddleware(CreateDepartmentTransferDto),
    controller.create,
);

router.get(
    '/',
    authMiddleware,
    permissionsMiddleware('DEPARTMENT_UPDATE'),
    controller.findAll,
);

/**
 * @swagger
 * /department-transfers/{id}:
 *   get:
 *     summary: Get department transfer by ID
 *     tags: [DepartmentTransfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transfer ID
 *     responses:
 *       200:
 *         description: Transfer details
 *       404:
 *         description: Transfer not found
 */
router.get(
    '/:id',
    authMiddleware,
    permissionsMiddleware('DEPARTMENT_UPDATE'),
    controller.findOne,
);

export const departmentTransfersRoutes = router;
