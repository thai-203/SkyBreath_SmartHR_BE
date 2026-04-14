import express from 'express';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { validationMiddleware } from '../common/middleware/validation.middleware.js';
import { AttendanceAllowedIpController } from '../controllers/attendance-allowed-ip.controller.js';
import { CreateAttendanceAllowedIpDto } from '../models/dto/attendance-allowed-ip/create-attendance-allowed-ip.dto.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';

const router = express.Router();
const controller = new AttendanceAllowedIpController();

// NOTE: Here we reuse the same DTO for simplicity (allows ipRange + description + isActive) - if you want strict schema, create a DTO specifically for allowed IPs.

router.get(
  '/',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_SECURITY_CONFIG_READ'),
  (req, res, next) => controller.list(req, res, next),
);
router.post(
  '/',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_SECURITY_CONFIG_UPDATE'),
  validationMiddleware(CreateAttendanceAllowedIpDto),
  (req, res, next) => controller.create(req, res, next),
);
router.delete(
  '/:id',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_SECURITY_CONFIG_UPDATE'),
  (req, res, next) => controller.delete(req, res, next),
);

export const attendanceAllowedIpRoutes = router;
