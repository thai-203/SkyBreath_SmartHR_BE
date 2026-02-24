import express from 'express';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';
import { HolidayListController } from '../controllers/holiday-list.controller.js';

const router = express.Router();
const controller = new HolidayListController();

// UC - Holiday List
router.get('/', authMiddleware, permissionsMiddleware('HOLIDAY_READ'), (req, res, next) => controller.findAll(req, res, next));
router.get('/export', authMiddleware, permissionsMiddleware('HOLIDAY_EXPORT'), (req, res, next) => controller.export(req, res, next));
router.get('/:id', authMiddleware, permissionsMiddleware('HOLIDAY_READ'), (req, res, next) => controller.findById(req, res, next));
router.post('/', authMiddleware, permissionsMiddleware('HOLIDAY_CREATE'), (req, res, next) => controller.create(req, res, next));
router.put('/:id', authMiddleware, permissionsMiddleware('HOLIDAY_UPDATE'), (req, res, next) => controller.update(req, res, next));
router.delete('/:id', authMiddleware, permissionsMiddleware('HOLIDAY_DELETE'), (req, res, next) => controller.delete(req, res, next));

export const holidayListRoutes = router;
