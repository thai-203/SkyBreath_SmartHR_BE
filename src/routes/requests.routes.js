import { Router } from 'express';
import { RequestsController } from '../controllers/requests.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';
import { uploadCloud } from '../common/middleware/upload.middleware.js';

const router = Router();
const requestsController = new RequestsController();

// GET /requests/excuses — Đơn giải trình (nhóm LATE_EARLY / ATTENDANCE_CORRECTION)
router.get('/excuses', authMiddleware, permissionsMiddleware('REQUEST_READ'), requestsController.getExcuseRequests);

// GET /requests/overtime-detail — Bảng tăng ca chi tiết (nhóm OVERTIME + dòng chi tiết hoặc tổng hợp từ đơn)
router.get('/overtime-detail', authMiddleware, permissionsMiddleware(['REQUEST_READ', 'REQUEST_READ_OWN']), requestsController.getOvertimeDetailRequests);

// GET /requests/my — Đơn của tôi
router.get(
  '/my',
  authMiddleware,
  permissionsMiddleware(['REQUEST_READ', 'REQUEST_READ_OWN']),
  requestsController.getMyRequests,
);

// GET /requests/pending — Đơn chờ tôi duyệt
router.get(
  '/pending',
  authMiddleware,
  permissionsMiddleware('REQUEST_READ'),
  requestsController.getPendingApprovals,
);

// GET /requests/workflow-preview
router.get(
  '/workflow-preview',
  authMiddleware,
  permissionsMiddleware(['REQUEST_READ', 'REQUEST_READ_OWN']),
  requestsController.getWorkflowPreview,
);

// GET /requests/quota-status — Kiểm tra hạn mức policy
router.get('/quota-status', authMiddleware, permissionsMiddleware('REQUEST_READ'), requestsController.getQuotaStatus);

// GET /requests/estimate-quantity — Ước tính số lượng ngày/giờ xin phép dựa trên ca làm việc
router.get('/estimate-quantity', authMiddleware, permissionsMiddleware('REQUEST_READ'), requestsController.estimateQuantity);

// GET /requests — Tất cả (HR/Admin)
router.get(
  '/',
  authMiddleware,
  permissionsMiddleware('REQUEST_READ'),
  requestsController.getAllRequests,
);

// GET /requests/:id — Chi tiết
router.get(
  '/:id',
  authMiddleware,
  permissionsMiddleware(['REQUEST_READ', 'REQUEST_READ_OWN']),
  requestsController.getById,
);

// POST /requests/draft — Lưu nháp
router.post(
  '/draft',
  authMiddleware,
  permissionsMiddleware('REQUEST_CREATE'),
  requestsController.saveDraft,
);

// POST /requests/:id/submit
router.post(
  '/:id/submit',
  authMiddleware,
  permissionsMiddleware('REQUEST_CREATE'),
  requestsController.submit,
);

// POST /requests/:id/cancel
router.post(
  '/:id/cancel',
  authMiddleware,
  permissionsMiddleware('REQUEST_CANCEL'),
  requestsController.cancel,
);

// POST /requests/:id/approve
router.post(
  '/:id/approve',
  authMiddleware,
  permissionsMiddleware('REQUEST_APPROVE'),
  requestsController.approve,
);

// POST /requests/:id/reject
router.post(
  '/:id/reject',
  authMiddleware,
  permissionsMiddleware('REQUEST_APPROVE'),
  requestsController.reject,
);

// POST /requests/:id/revoke
router.post(
  '/:id/revoke',
  authMiddleware,
  permissionsMiddleware('REQUEST_UPDATE'),
  requestsController.revoke,
);

// POST /requests/:id/attachments — Upload tài liệu đính kèm
router.post('/:id/attachments', authMiddleware, uploadCloud.array('files', 10), requestsController.uploadAttachments);

export const requestsRoutes = router;
