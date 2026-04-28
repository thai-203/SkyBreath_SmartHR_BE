import express from 'express';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { AttendanceBlockingConfigController } from '../controllers/attendance-blocking-configs.controller.js';
import { AttendanceBlockingConfigRepository } from '../repositories/attendance-blocking-config.repository.js';
import { AttendanceBlockingConfigService } from '../services/attendance-blocking-configs.service.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';

const router = express.Router();

const attendanceBlockingConfigRepository =
  new AttendanceBlockingConfigRepository();
const attendanceBlockingConfigService = new AttendanceBlockingConfigService(
  attendanceBlockingConfigRepository,
);
const attendanceBlockingConfigController =
  new AttendanceBlockingConfigController(attendanceBlockingConfigService);

// 1. Lấy danh sách quy tắc
router.get(
  '/',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_BLOCKING_CONFIG_READ'),
  attendanceBlockingConfigController.getRules,
);

// 2. Tạo quy tắc mới
router.post(
  '/',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_BLOCKING_CONFIG_CREATE'),
  attendanceBlockingConfigController.createRule,
);

// 3. Cập nhật quy tắc theo ID
router.put(
  '/:id',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_BLOCKING_CONFIG_UPDATE'),
  attendanceBlockingConfigController.updateRule,
);

// 4. Toggle trạng thái (Bật/Tắt) nhanh
router.patch(
  '/:id/status',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_BLOCKING_CONFIG_STATUS_CHANGE'),
  attendanceBlockingConfigController.toggleStatus,
);

router.delete(
  '/:id',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_BLOCKING_CONFIG_DELETE'),
  attendanceBlockingConfigController.deleteRule,
);

// 6. Lấy lịch sử log điểm danh (check_in, check_out, join)
router.get(
  '/logs',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_BLOCKING_CONFIG_READ'),
  attendanceBlockingConfigController.getAttendanceLogs,
);

export const attendanceBlockingConfigRoutes = router;
