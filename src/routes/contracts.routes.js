import { Router } from 'express';
import { ContractsController } from '../controllers/contracts.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';
import { validationMiddleware } from '../common/middleware/validation.middleware.js';
import {
  CreateContractDto,
  UpdateContractDto,
  ContractQueryDto,
} from '../models/dto/contracts/index.js';
import { upload } from '../common/middleware/upload.middleware.js';

const router = Router();
const contractsController = new ContractsController();

/**
 * @swagger
 * tags:
 *   name: Contracts
 *   description: Contract management
 */

/**
 * @swagger
 * /contracts:
 *   post:
 *     summary: Create a new employment contract
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateContractDto'
 *     responses:
 *       201:
 *         description: Contract created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *   get:
 *     summary: Get all employment contracts
 *     tags: [Contracts]
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
 *         description: Search by contract number or employee name
 *       - in: query
 *         name: contractStatus
 *         schema:
 *           type: string
 *           enum: [ACTIVE, TERMINATED, EXPIRED]
 *         description: Filter by contract status (ACTIVE, TERMINATED, EXPIRED)
 *       - in: query
 *         name: contractType
 *         schema:
 *           type: string
 *         description: Filter by contract type
 *     responses:
 *       200:
 *         description: List of contracts with pagination
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  authMiddleware,
  upload.array('attachments'),
  permissionsMiddleware('CONTRACT_CREATE'),
  validationMiddleware(CreateContractDto),
  contractsController.create,
);
router.get(
  '/',
  authMiddleware,
  permissionsMiddleware('CONTRACT_READ'),
  contractsController.findAll,
);

/**
 * @swagger
 * /contracts/search:
 *   get:
 *     summary: Search contracts by keyword
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: keyword
 *         required: true
 *         schema:
 *           type: string
 *         description: Search keyword
 *     responses:
 *       200:
 *         description: Search results
 */
router.get(
  '/search',
  authMiddleware,
  permissionsMiddleware('CONTRACT_READ'),
  contractsController.search,
);

/**
 * @swagger
 * /contracts/status/{status}:
 *   get:
 *     summary: Get contracts by status
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [ACTIVE, TERMINATED, EXPIRED]
 *         description: Contract status (ACTIVE, TERMINATED, EXPIRED)
 *     responses:
 *       200:
 *         description: Contracts with specified status
 *       400:
 *         description: Invalid status supplied
 */
router.get(
  '/status/:status',
  authMiddleware,
  permissionsMiddleware('CONTRACT_READ'),
  contractsController.getByStatus,
);

/**
 * @swagger
 * /contracts/expired:
 *   get:
 *     summary: Get expired contracts
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of expired contracts
 */
router.get(
  '/expired',
  authMiddleware,
  permissionsMiddleware('CONTRACT_READ'),
  contractsController.getExpired,
);

/**
 * @swagger
 * /contracts/export:
 *   get:
 *     summary: Export contracts to Excel
 *     tags: [Contracts]
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
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: contractStatus
 *         schema:
 *           type: string
 *       - in: query
 *         name: contractType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Excel file
 */
router.get(
  '/export',
  authMiddleware,
  permissionsMiddleware('CONTRACT_EXPORT'),
  contractsController.export,
);

/**
 * @swagger
 * /contracts/employee/{employeeId}:
 *   get:
 *     summary: Get contracts for a specific employee
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: List of employee contracts
 *       404:
 *         description: Employee not found
 */
router.get(
  '/employee/:employeeId',
  authMiddleware,
  permissionsMiddleware('CONTRACT_READ'),
  contractsController.findByEmployee,
);

/**
 * @swagger
 * /contracts/{id}:
 *   get:
 *     summary: Get contract by ID
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Contract ID
 *     responses:
 *       200:
 *         description: Contract details
 *       404:
 *         description: Contract not found
 *   put:
 *     summary: Update employment contract
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Contract ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateContractDto'
 *     responses:
 *       200:
 *         description: Contract updated successfully
 *       404:
 *         description: Contract not found
 *   delete:
 *     summary: Delete employment contract
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Contract ID
 *     responses:
 *       200:
 *         description: Contract deleted successfully
 *       404:
 *         description: Contract not found
 */
router.get(
  '/:id',
  authMiddleware,
  permissionsMiddleware('CONTRACT_READ'),
  contractsController.findOne,
);
router.put(
  '/:id',
  upload.array('attachments'),
  authMiddleware,
  permissionsMiddleware('CONTRACT_UPDATE'),
  contractsController.update,
);

/**
 * @swagger
 * /contracts/{id}/terminate:
 *   put:
 *     summary: Terminate an employment contract
 *     description: Mark a contract as terminated and store termination information (a future date will schedule the change; status updates automatically when date arrives)
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Contract ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - terminationDate
 *               - terminationReason
 *             properties:
 *               terminationDate:
 *                 type: string
 *                 format: date
 *                 example: 2026-02-10
 *               terminationReason:
 *                 type: string
 *                 example: employee_resigned
 *               terminationCompensation:
 *                 type: number
 *                 example: 2000000
 *               terminationNote:
 *                 type: string
 *                 example: Bàn giao đầy đủ tài sản
 *     responses:
 *       200:
 *         description: Contract terminated successfully
 *       400:
 *         description: Invalid request or contract already terminated
 *       404:
 *         description: Contract not found
 */
router.put(
  '/:id/terminate',
  authMiddleware,
  permissionsMiddleware('CONTRACT_UPDATE'),
  contractsController.terminate,
);

router.delete(
  '/:id',
  authMiddleware,
  permissionsMiddleware('CONTRACT_DELETE'),
  contractsController.remove,
);

export const contractsRoutes = router;
