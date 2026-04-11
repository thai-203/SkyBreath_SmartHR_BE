import { Router } from 'express';
import { AiConfigurationsController } from '../controllers/ai-configurations.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { rolesMiddleware } from '../common/middleware/roles.middleware.js';

const router = Router();
const controller = new AiConfigurationsController();

// Admin only routes
router.use(authMiddleware, rolesMiddleware(['ADMIN']));

router.get('/', controller.getAll);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export const aiConfigurationsRoutes = router;
