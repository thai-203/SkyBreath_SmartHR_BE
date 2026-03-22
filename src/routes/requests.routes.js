import { Router } from 'express';
import { RequestsController } from '../controllers/requests.controller.js';
import { RequestsService } from '../services/requests.service.js';
import { RequestsRepository } from '../repositories/requests.repository.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';

const router = Router();

// Dependency Injection
const requestsRepository = new RequestsRepository();
const requestsService = new RequestsService(requestsRepository);
const requestsController = new RequestsController(requestsService);

/**
 * @swagger
 * tags:
 *   name: Requests
 *   description: Request management endpoints
 */

router.get('/leaves/calendar', authMiddleware, requestsController.getLeaveCalendar);

export const requestsRoutes = router;
