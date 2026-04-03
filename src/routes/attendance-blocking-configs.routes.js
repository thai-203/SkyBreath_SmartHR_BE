import express from 'express';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { AttendanceBlockingConfigController } from '../controllers/attendance-blocking-configs.controller.js';
import { AttendanceBlockingConfigRepository } from '../repositories/attendance-blocking-config.repository.js';
import { AttendanceBlockingConfigService } from '../services/attendance-blocking-configs.service.js';

const router = express.Router();

const attendanceBlockingConfigRepository = new AttendanceBlockingConfigRepository();
const attendanceBlockingConfigService = new AttendanceBlockingConfigService(attendanceBlockingConfigRepository);
const attendanceBlockingConfigController = new AttendanceBlockingConfigController(attendanceBlockingConfigService);

// 1. Lấy danh sách quy tắc
router.get(
  '/',
  authMiddleware,
  attendanceBlockingConfigController.getRules
);

// 2. Tạo quy tắc mới
router.post(
  '/',
  authMiddleware,
  attendanceBlockingConfigController.createRule
);

// 3. Cập nhật quy tắc theo ID
router.put(
  '/:id',
  authMiddleware,
  attendanceBlockingConfigController.updateRule
);

// 4. Toggle trạng thái (Bật/Tắt) nhanh
router.patch(
  '/:id/status',
  authMiddleware,
  attendanceBlockingConfigController.toggleStatus
);

router.delete(
  '/:id',
  authMiddleware,
  attendanceBlockingConfigController.deleteRule
);

export const attendanceBlockingConfigRoutes = router;