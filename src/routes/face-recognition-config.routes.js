import express from 'express';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { FaceRecognitionConfigController } from '../controllers/face-recognition-config.controller.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';

const router = express.Router();
const controller = new FaceRecognitionConfigController();

// Only admins can change system face config
router.get(
  '/',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_FACE_RECOGNITION_CONFIG_READ'),
  controller.getConfig,
);

router.get('/public', authMiddleware, controller.getConfig);
router.put(
  '/',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_FACE_RECOGNITION_CONFIG_UPDATE'),
  controller.updateConfig,
);
router.post(
  '/reset',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_FACE_RECOGNITION_CONFIG_UPDATE'),
  controller.resetToDefaults,
);

export const faceRecognitionConfigRoutes = router;
