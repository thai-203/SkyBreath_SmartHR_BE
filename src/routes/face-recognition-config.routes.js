import express from 'express';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { rolesMiddleware } from '../common/middleware/roles.middleware.js';
import { Role } from '../common/enums/index.js';
import { validationMiddleware } from '../common/middleware/validation.middleware.js';
import { FaceRecognitionConfigController } from '../controllers/face-recognition-config.controller.js';
import { UpdateFaceRecognitionConfigDto } from '../models/dto/face-recognition-config/update-face-recognition-config.dto.js';

const router = express.Router();
const controller = new FaceRecognitionConfigController();

// Only admins can change system face config
router.get('/', authMiddleware, controller.getConfig);
router.put(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validationMiddleware(UpdateFaceRecognitionConfigDto),
  controller.updateConfig,
);
router.post(
  '/reset',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  controller.resetToDefaults,
);

export const faceRecognitionConfigRoutes = router;
