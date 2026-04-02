import express from 'express';
import { AiController } from '../controllers/ai.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';

export const aiRoutes = express.Router();
const aiController = new AiController();

aiRoutes.post('/chat', authMiddleware, aiController.chat);
