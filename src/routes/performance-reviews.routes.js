import { Router } from 'express';
import { PerformanceReviewsController } from '../controllers/performance-reviews.controller.js';
import { PerformanceReviewsService } from '../services/performance-reviews.service.js';
import { PerformanceReviewsRepository } from '../repositories/performance-reviews.repository.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';

const router = Router();

// Dependency Injection
const performanceReviewsRepository = new PerformanceReviewsRepository();
const performanceReviewsService = new PerformanceReviewsService(performanceReviewsRepository);
const performanceReviewsController = new PerformanceReviewsController(performanceReviewsService);

// Routes
// Get list of employees managed by current user (for dropdown)
router.get(
    '/managed-employees',
    authMiddleware,
    // permissionsMiddleware('PERFORMANCE_REVIEW_READ'),
    performanceReviewsController.getManagedEmployees,
);

// List all reviews (with filters)
router.get(
    '/',
    authMiddleware,
    // permissionsMiddleware('PERFORMANCE_REVIEW_READ'),
    performanceReviewsController.findAll,
);

// Get single review by ID
router.get(
    '/:id',
    authMiddleware,
    // permissionsMiddleware('PERFORMANCE_REVIEW_READ'),
    performanceReviewsController.findById,
);

// Create new review
router.post(
    '/',
    authMiddleware,
    // permissionsMiddleware('PERFORMANCE_REVIEW_CREATE'),
    performanceReviewsController.create,
);

// Update review
router.put(
    '/:id',
    authMiddleware,
    // permissionsMiddleware('PERFORMANCE_REVIEW_UPDATE'),
    performanceReviewsController.update,
);

// Delete review
router.delete(
    '/:id',
    authMiddleware,
    // permissionsMiddleware('PERFORMANCE_REVIEW_DELETE'),
    performanceReviewsController.delete,
);

export const performanceReviewsRoutes = router;
