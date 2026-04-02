import express from 'express';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { rolesMiddleware } from '../common/middleware/roles.middleware.js';
import { Role } from '../common/enums/index.js';
import { validationMiddleware } from '../common/middleware/validation.middleware.js';
import { AttendanceSecurityConfigController } from '../controllers/attendance-security-config.controller.js';
import { UpdateAttendanceSecurityConfigDto } from '../models/dto/attendance-security-config/update-attendance-security-config.dto.js';

const router = express.Router();
const controller = new AttendanceSecurityConfigController();

router.get('/', authMiddleware, (req, res, next) => controller.getConfig(req, res, next));
router.put('/', authMiddleware, rolesMiddleware([Role.ADMIN]), validationMiddleware(UpdateAttendanceSecurityConfigDto), (req, res, next) => controller.updateConfig(req, res, next));
router.post('/reset', authMiddleware, rolesMiddleware([Role.ADMIN]), (req, res, next) => controller.resetToDefaults(req, res, next));

export const attendanceSecurityConfigRoutes = router;
