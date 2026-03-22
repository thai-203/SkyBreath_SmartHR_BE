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

/**
 * @swagger
 * /requests:
 *   post:
 *     summary: Create a new request (EXCUSE, OVERTIME, LEAVE)
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requestType
 *               - startDate
 *             properties:
 *               employeeId:
 *                 type: integer
 *               requestType:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               requestContent:
 *                 type: object
 *                 description: JSON data containing reason, proofImage, etc.
 *     responses:
 *       201:
 *         description: Request created
 */
router.post('/', authMiddleware, requestsController.create);

export const requestsRoutes = router;
