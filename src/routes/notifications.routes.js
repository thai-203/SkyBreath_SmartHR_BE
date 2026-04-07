import { Router } from 'express';
import { NotificationsController } from '../controllers/notifications.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';

const router = Router();
const controller = new NotificationsController();

router.use(authMiddleware);

// ─── User-facing ──────────────────────────────────────────────────────────────
// GET /notifications — Danh sách thông báo (phân trang, lọc ?filter=unread|read)
router.get('/', controller.getMyNotifications);

// GET /notifications/unread-count — Số lượng chưa đọc
router.get('/unread-count', controller.getUnreadCount);

// PATCH /notifications/read-all — Đánh dấu tất cả đã đọc
router.patch('/read-all', controller.markAllAsRead);

// PATCH /notifications/:id/read — Đánh dấu 1 thông báo đã đọc
router.patch('/:id/read', controller.markAsRead);

// ─── UC-NOTI-05: Manual Notification ─────────────────────────────────────────
// POST /notifications/manual — Gửi thông báo thủ công
router.post(
    '/manual',
    permissionsMiddleware('SEND_MANUAL_NOTIFICATION'),
    controller.sendManualNotification,
);

// ─── UC-NOTI-06: Notification History ────────────────────────────────────────
// GET /notifications/history — Lịch sử gửi thông báo
router.get(
    '/history',
    permissionsMiddleware('VIEW_NOTIFICATION_HISTORY'),
    controller.getNotificationHistory,
);

// GET /notifications/history/:id — Chi tiết bản ghi lịch sử
router.get(
    '/history/:id',
    permissionsMiddleware('VIEW_NOTIFICATION_HISTORY'),
    controller.getNotificationHistoryDetail,
);

export { router as notificationsRoutes };
