import { Router } from 'express';
import { NotificationsController } from '../controllers/notifications.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';

const router = Router();
const controller = new NotificationsController();

router.use(authMiddleware);

// GET /notifications — Danh sách thông báo (phân trang, lọc ?filter=unread|read)
router.get('/', controller.getMyNotifications);

// GET /notifications/unread-count — Số lượng chưa đọc
router.get('/unread-count', controller.getUnreadCount);

// PATCH /notifications/read-all — Đánh dấu tất cả đã đọc
router.patch('/read-all', controller.markAllAsRead);

// PATCH /notifications/:id/read — Đánh dấu 1 thông báo đã đọc
router.patch('/:id/read', controller.markAsRead);

export { router as notificationsRoutes };
