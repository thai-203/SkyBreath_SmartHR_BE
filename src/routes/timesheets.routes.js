import { Router } from 'express';
import { TimesheetsController } from '../controllers/timesheets.controller.js';
import { TimesheetsService } from '../services/timesheets.service.js';
import { TimesheetsRepository } from '../repositories/timesheets.repository.js';
import { ActionLogsService } from '../services/action-logs.service.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';

const router = Router();

// Dependency Injection
const timesheetsRepository = new TimesheetsRepository();
const actionLogsService = new ActionLogsService();
const timesheetsService = new TimesheetsService(timesheetsRepository, actionLogsService);
const timesheetsController = new TimesheetsController(timesheetsService);

/**
 * @swagger
 * tags:
 *   name: Timesheets
 *   description: Monthly timesheet management endpoints
 */

/**
 * @swagger
 * /timesheets/generate:
 *   post:
 *     summary: Generate monthly timesheets
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - month
 *               - year
 *             properties:
 *               month:
 *                 type: integer
 *               year:
 *                 type: integer
 *               departmentId:
 *                 type: integer
 *               regenerate:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Successfully generated timesheets
 */
router.post('/generate', authMiddleware, permissionsMiddleware('TIMESHEET_CREATE'), timesheetsController.generate);

/**
 * @swagger
 * /timesheets/add-employee:
 *   post:
 *     summary: Add an employee to a timesheet
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - month
 *               - year
 *             properties:
 *               employeeId:
 *                 type: integer
 *               month:
 *                 type: integer
 *               year:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Employee timesheet created
 */
router.post('/add-employee', authMiddleware, permissionsMiddleware('TIMESHEET_CREATE'), timesheetsController.addEmployee);

/**
 * @swagger
 * /timesheets:
 *   get:
 *     summary: Get all timesheets
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of timesheets
 */
router.get('/', authMiddleware, permissionsMiddleware('TIMESHEET_READ'), timesheetsController.findAll);

// UC27 - Export (must be before /:id routes)
/**
 * @swagger
 * /timesheets/export/summary:
 *   get:
 *     summary: Export summary report of timesheets
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Excel file
 */
router.get('/export/summary', authMiddleware, permissionsMiddleware('TIMESHEET_EXPORT'), timesheetsController.exportSummary);

/**
 * @swagger
 * /timesheets/export/detailed:
 *   get:
 *     summary: Export detailed report of timesheets
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Excel file
 */
router.get('/export/detailed', authMiddleware, permissionsMiddleware('TIMESHEET_EXPORT'), timesheetsController.exportDetailed);

// UC24 - View detail
/**
 * @swagger
 * /timesheets/{id}:
 *   get:
 *     summary: Get timesheet by ID
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Timesheet details
 */
router.get('/:id', authMiddleware, permissionsMiddleware('TIMESHEET_READ'), timesheetsController.findById);

/**
 * @swagger
 * /timesheets/{id}/attendance:
 *   get:
 *     summary: Get detailed attendance for a timesheet
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Daily attendance details
 */
router.get('/:id/attendance', authMiddleware, permissionsMiddleware('TIMESHEET_READ'), timesheetsController.getAttendanceDetails);

// UC-Excuse Page
router.get('/attendance/late-early', authMiddleware, permissionsMiddleware('TIMESHEET_READ'), timesheetsController.getLateEarlyRecords);

// UC25 - Recalculate & Edit
/**
 * @swagger
 * /timesheets/bulk-recalculate:
 *   post:
 *     summary: Bulk recalculate timesheets
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - month
 *               - year
 *             properties:
 *               month:
 *                 type: integer
 *               year:
 *                 type: integer
 *               departmentId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Successfully recalculated
 */
router.post('/bulk-recalculate', authMiddleware, permissionsMiddleware('TIMESHEET_UPDATE'), timesheetsController.bulkRecalculate);

/**
 * @swagger
 * /timesheets/{id}/recalculate:
 *   post:
 *     summary: Recalculate a single timesheet
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Timesheet recalculated
 */
router.post('/:id/recalculate', authMiddleware, permissionsMiddleware('TIMESHEET_UPDATE'), timesheetsController.recalculate);

/**
 * @swagger
 * /timesheets/{id}:
 *   put:
 *     summary: Update a timesheet manually
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               totalWorkingDays:
 *                 type: number
 *               totalWorkingHours:
 *                 type: number
 *               overtimeHours:
 *                 type: number
 *               editReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Timesheet updated
 */
router.put('/:id', authMiddleware, permissionsMiddleware('TIMESHEET_UPDATE'), timesheetsController.update);

/**
 * @swagger
 * /timesheets/{id}:
 *   delete:
 *     summary: Soft delete a timesheet
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Timesheet deleted
 */
router.delete('/:id', authMiddleware, permissionsMiddleware('TIMESHEET_CREATE'), timesheetsController.remove);

// UC26 - Lock / Unlock
/**
 * @swagger
 * /timesheets/bulk-lock:
 *   post:
 *     summary: Bulk lock timesheets
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - month
 *               - year
 *             properties:
 *               month:
 *                 type: integer
 *               year:
 *                 type: integer
 *               departmentId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Successfully locked
 */
router.post('/bulk-lock', authMiddleware, permissionsMiddleware('TIMESHEET_LOCK'), timesheetsController.bulkLock);

/**
 * @swagger
 * /timesheets/{id}/lock:
 *   post:
 *     summary: Lock a single timesheet
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Timesheet locked
 */
router.post('/:id/lock', authMiddleware, permissionsMiddleware('TIMESHEET_LOCK'), timesheetsController.lock);

export const timesheetsRoutes = router;
