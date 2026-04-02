import express from 'express';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { AttendanceController } from '../controllers/attendance.controller.js';
import { AttendanceService } from '../services/attendance.service.js';
import { upload } from '../common/middleware/upload.middleware.js';

const router = express.Router();

const attendanceService = new AttendanceService();
const attendanceController = new AttendanceController(attendanceService);

// Admin endpoints
router.get(
  '/today-context',
  authMiddleware,
  attendanceController.getTodayContext,
);

router.post(
  '/check-in',
  authMiddleware,
  upload.array('frames', 10),
  attendanceController.checkIn,
);

router.post(
  '/check-out',
  authMiddleware,
  upload.array('frames', 10),
  attendanceController.checkOut,
);

export const attendanceRoutes = router;
