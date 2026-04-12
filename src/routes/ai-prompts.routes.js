import express from 'express';
import { AiPromptsController } from '../controllers/ai-prompts.controller.js';
import { rolesMiddleware } from '../common/middleware/roles.middleware.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';

export const aiPromptsRoutes = express.Router();
const controller = new AiPromptsController();

// Bảo vệ bằng xác thực và phân quyền (chỉ dành cho ADMIN)
aiPromptsRoutes.use(authMiddleware);
aiPromptsRoutes.use(rolesMiddleware(['ADMIN']));

aiPromptsRoutes.get('/', controller.getAll);
aiPromptsRoutes.get('/:id', controller.getById);
aiPromptsRoutes.post('/', controller.create);
aiPromptsRoutes.put('/:id', controller.update);
aiPromptsRoutes.delete('/:id', controller.delete);
