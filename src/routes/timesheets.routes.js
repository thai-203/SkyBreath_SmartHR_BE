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

// UC24 - Generate & View
router.post('/generate', authMiddleware, permissionsMiddleware('TIMESHEET_CREATE'), timesheetsController.generate);
router.post('/add-employee', authMiddleware, permissionsMiddleware('TIMESHEET_CREATE'), timesheetsController.addEmployee);
router.get('/', authMiddleware, permissionsMiddleware('TIMESHEET_READ'), timesheetsController.findAll);

// UC27 - Export (must be before /:id routes)
router.get('/export/summary', authMiddleware, permissionsMiddleware('TIMESHEET_EXPORT'), timesheetsController.exportSummary);
router.get('/export/detailed', authMiddleware, permissionsMiddleware('TIMESHEET_EXPORT'), timesheetsController.exportDetailed);

// UC24 - View detail
router.get('/:id', authMiddleware, permissionsMiddleware('TIMESHEET_READ'), timesheetsController.findById);
router.get('/:id/attendance', authMiddleware, permissionsMiddleware('TIMESHEET_READ'), timesheetsController.getAttendanceDetails);

// UC25 - Recalculate & Edit
router.post('/:id/recalculate', authMiddleware, permissionsMiddleware('TIMESHEET_UPDATE'), timesheetsController.recalculate);
router.put('/:id', authMiddleware, permissionsMiddleware('TIMESHEET_UPDATE'), timesheetsController.update);
router.delete('/:id', authMiddleware, permissionsMiddleware('TIMESHEET_CREATE'), timesheetsController.remove);

// UC26 - Lock / Unlock
router.post('/bulk-lock', authMiddleware, permissionsMiddleware('TIMESHEET_LOCK'), timesheetsController.bulkLock);
router.post('/:id/lock', authMiddleware, permissionsMiddleware('TIMESHEET_LOCK'), timesheetsController.lock);
router.post('/:id/unlock', authMiddleware, permissionsMiddleware('TIMESHEET_LOCK'), timesheetsController.unlock);

export const timesheetsRoutes = router;
