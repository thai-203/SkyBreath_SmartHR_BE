import express from 'express';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { AttendanceController } from '../controllers/attendance.controller.js';
import { AttendanceService } from '../services/attendance.service.js';
import { upload, uploadCloud } from '../common/middleware/upload.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';

const router = express.Router();

const attendanceService = new AttendanceService();
const attendanceController = new AttendanceController(attendanceService);

// Admin endpoints
router.get(
  '/today-context',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_READ_OWN'),
  attendanceController.getTodayContext,
);

router.post(
  '/check-in',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_RECORD'),
  uploadCloud.array('frames', 10),
  attendanceController.checkIn,
);

router.post(
  '/check-out',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_RECORD'),
  uploadCloud.array('frames', 10),
  attendanceController.checkOut,
);

export const attendanceRoutes = router;
