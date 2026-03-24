import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller.js';
import { uploadMiddleware } from '../common/middleware/upload.middleware.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';

const router = Router();
const uploadController = new UploadController();

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: File upload endpoints
 */

/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Upload an image file for evidence
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 */
router.post('/', authMiddleware, uploadMiddleware.single('file'), uploadController.uploadImage);

export const uploadRoutes = router;
