import { Router } from 'express';
import { HolidayConfigController } from '../controllers/holiday-configs.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';

const router = Router();
const controller = new HolidayConfigController();

router.get('/', authMiddleware, permissionsMiddleware('HOLIDAY_READ'), (req, res, next) => controller.getConfig(req, res, next));
router.put('/', authMiddleware, permissionsMiddleware('HOLIDAY_UPDATE'), (req, res, next) => controller.updateConfig(req, res, next));
router.post('/trigger-reminders', authMiddleware, permissionsMiddleware('HOLIDAY_UPDATE'), (req, res, next) => controller.triggerReminders(req, res, next));

export default router;
