import { Router } from 'express';
import { RequestsController } from '../controllers/requests.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';

const router = Router();
const requestsController = new RequestsController();

// GET /requests/my — Đơn của tôi
router.get('/my', authMiddleware, permissionsMiddleware('REQUEST_READ'), requestsController.getMyRequests);

// GET /requests/pending — Đơn chờ tôi duyệt
router.get('/pending', authMiddleware, permissionsMiddleware('REQUEST_APPROVE'), requestsController.getPendingApprovals);

// GET /requests/workflow-preview
router.get('/workflow-preview', authMiddleware, permissionsMiddleware('REQUEST_READ'), requestsController.getWorkflowPreview);

// GET /requests — Tất cả (HR/Admin)
router.get('/', authMiddleware, permissionsMiddleware('REQUEST_VIEW_ALL'), requestsController.getAllRequests);

// GET /requests/:id — Chi tiết
router.get('/:id', authMiddleware, permissionsMiddleware('REQUEST_READ'), requestsController.getById);

// POST /requests/draft — Lưu nháp
router.post('/draft', authMiddleware, permissionsMiddleware('REQUEST_CREATE'), requestsController.saveDraft);

// POST /requests/:id/submit
router.post('/:id/submit', authMiddleware, permissionsMiddleware('REQUEST_SUBMIT'), requestsController.submit);

// POST /requests/:id/cancel
router.post('/:id/cancel', authMiddleware, permissionsMiddleware('REQUEST_CANCEL'), requestsController.cancel);

// POST /requests/:id/approve
router.post('/:id/approve', authMiddleware, permissionsMiddleware('REQUEST_APPROVE'), requestsController.approve);

// POST /requests/:id/reject
router.post('/:id/reject', authMiddleware, permissionsMiddleware('REQUEST_APPROVE'), requestsController.reject);

// POST /requests/:id/revoke
router.post('/:id/revoke', authMiddleware, permissionsMiddleware('REQUEST_REVOKE'), requestsController.revoke);

export const requestsRoutes = router;
