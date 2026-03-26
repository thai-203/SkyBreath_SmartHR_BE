import { Router } from 'express';
import { HolidayGroupController } from '../controllers/holiday-groups.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';

const router = Router();
const controller = new HolidayGroupController();

router.get('/', authMiddleware, permissionsMiddleware('HOLIDAY_READ'), (req, res, next) => controller.findAll(req, res, next));
router.get('/:id', authMiddleware, permissionsMiddleware('HOLIDAY_READ'), (req, res, next) => controller.findById(req, res, next));
router.post('/', authMiddleware, permissionsMiddleware('HOLIDAY_CREATE'), (req, res, next) => controller.create(req, res, next));
router.post('/:id/inherit', (req, res, next) => controller.inherit(req, res, next));
router.put('/:id', (req, res, next) => controller.update(req, res, next));
router.delete('/:id', authMiddleware, permissionsMiddleware('HOLIDAY_DELETE'), (req, res, next) => controller.delete(req, res, next));

export default router;
