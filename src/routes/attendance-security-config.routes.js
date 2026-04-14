import express from 'express';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { validationMiddleware } from '../common/middleware/validation.middleware.js';
import { AttendanceSecurityConfigController } from '../controllers/attendance-security-config.controller.js';
import { UpdateAttendanceSecurityConfigDto } from '../models/dto/attendance-security-config/update-attendance-security-config.dto.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';

const router = express.Router();
const controller = new AttendanceSecurityConfigController();

router.get(
  '/',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_SECURITY_CONFIG_READ'),
  (req, res, next) => controller.getConfig(req, res, next),
);
router.put(
  '/',
  authMiddleware,
  validationMiddleware(UpdateAttendanceSecurityConfigDto),
  permissionsMiddleware('ATTENDANCE_SECURITY_CONFIG_UPDATE'),
  (req, res, next) => controller.updateConfig(req, res, next),
);
router.post(
  '/reset',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_SECURITY_CONFIG_UPDATE'),
  (req, res, next) => controller.resetToDefaults(req, res, next),
);

export const attendanceSecurityConfigRoutes = router;
