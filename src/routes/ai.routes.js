import express from 'express';
import { AiController } from '../controllers/ai.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';

export const aiRoutes = express.Router();
const aiController = new AiController();

// Chat
aiRoutes.post('/chat', authMiddleware, aiController.chat);

// Conversation management
aiRoutes.get('/conversations', authMiddleware, aiController.getConversations);
aiRoutes.post('/conversations', authMiddleware, aiController.createConversation);
aiRoutes.delete('/conversations/:id', authMiddleware, aiController.deleteConversation);
aiRoutes.get('/conversations/:id/messages', authMiddleware, aiController.getMessages);
