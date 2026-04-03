import express from 'express';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { upload } from '../common/middleware/upload.middleware.js';
import { FaceDataController } from '../controllers/face-data.controller.js';
import { FaceDataService } from '../services/face-data.service.js';

const router = express.Router();

const faceDataService = new FaceDataService();
const faceDataController = new FaceDataController(faceDataService);

// Admin endpoints
router.get('/', authMiddleware, faceDataController.getAllFaces);
router.get(
  '/registered',
  authMiddleware,
  faceDataController.getRegisteredFaces,
);
router.get(
  '/management/meta-data',
  authMiddleware,
  faceDataController.getManagementMetaData,
);
router.get('/:id', authMiddleware, faceDataController.findOne);

router.delete('/:id', authMiddleware, faceDataController.deleteFace);
router.delete(
  '/employee/:employeeId',
  authMiddleware,
  faceDataController.deleteFacesByEmployee,
);

// Require authentication for face registration and check-in
router.post(
  '/register-faces',
  authMiddleware,
  upload.array('images', 10),
  faceDataController.registerFace,
);

export default router;
