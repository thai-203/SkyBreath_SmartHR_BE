import express from 'express';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { upload } from '../common/middleware/upload.middleware.js';
import { FaceDataController } from '../controllers/face-data.controller.js';
import { FaceDataService } from '../services/face-data.service.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';

const router = express.Router();

const faceDataService = new FaceDataService();
const faceDataController = new FaceDataController(faceDataService);

// Admin endpoints
router.get(
  '/',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_FACE_DATA_READ'),
  faceDataController.getAllFaces,
);
router.get(
  '/registered',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_FACE_DATA_READ_OWN'),
  faceDataController.getRegisteredFaces,
);
router.get(
  '/management/meta-data',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_FACE_DATA_READ'),
  faceDataController.getManagementMetaData,
);
router.get(
  '/:id',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_FACE_DATA_READ'),
  faceDataController.findOne,
);

router.delete(
  '/:id',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_FACE_DATA_DELETE'),
  faceDataController.deleteFace,
);
router.delete(
  '/employee/:employeeId',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_FACE_DATA_DELETE'),
  faceDataController.deleteFacesByEmployee,
);

// Require authentication for face registration and check-in
router.post(
  '/register-faces',
  authMiddleware,
  permissionsMiddleware('ATTENDANCE_FACE_DATA_REGISTER'),
  upload.array('images', 10),
  faceDataController.registerFace,
);

export default router;
