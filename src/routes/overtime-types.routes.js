import { Router } from 'express';
import { OvertimeTypesController } from '../controllers/overtime-types.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';

const router = Router();
const controller = new OvertimeTypesController();

// GET /overtime-types — danh sách loại OT (seed sẵn, read-only)
router.get(
  '/',
  authMiddleware,
  permissionsMiddleware('OVERTIME_RULE_READ'),
  controller.findAll,
);

export const overtimeTypesRoutes = router;
