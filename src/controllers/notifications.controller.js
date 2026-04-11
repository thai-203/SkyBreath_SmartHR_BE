import { NotificationsService } from '../services/notifications.service.js';

export class NotificationsController {
    constructor() {
        this.service = new NotificationsService();
    }

    // ─── User-facing (đọc thông báo của mình) ─────────────────────────────

    // GET /notifications — Danh sách thông báo của tôi
    getMyNotifications = async (req, res, next) => {
        try {
            const { page = 1, limit = 20, filter } = req.query;
            const result = await this.service.getMyNotifications(req.user.id, {
                page: parseInt(page),
                limit: parseInt(limit),
                filter,
            });
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    // GET /notifications/unread-count — Số lượng chưa đọc
    getUnreadCount = async (req, res, next) => {
        try {
            const count = await this.service.getUnreadCount(req.user.id);
            res.json({ success: true, data: { count } });
        } catch (error) {
            next(error);
        }
    };

    // PATCH /notifications/:id/read — Đánh dấu đã đọc
    markAsRead = async (req, res, next) => {
        try {
            await this.service.markAsRead(parseInt(req.params.id), req.user.id);
            res.json({ success: true, message: 'Đã đánh dấu đã đọc' });
        } catch (error) {
            next(error);
        }
    };

    // PATCH /notifications/read-all — Đánh dấu tất cả đã đọc
    markAllAsRead = async (req, res, next) => {
        try {
            await this.service.markAllAsRead(req.user.id);
            res.json({ success: true, message: 'Đã đánh dấu tất cả đã đọc' });
        } catch (error) {
            next(error);
        }
    };

    // ─── UC-NOTI-05: MANUAL NOTIFICATION ──────────────────────────────────

    // POST /notifications/manual
    sendManualNotification = async (req, res, next) => {
        try {
            const { title, message, recipientScope, scopeIds, scheduledAt } = req.body;
            const result = await this.service.sendManualNotification({
                title,
                message,
                recipientScope,
                scopeIds: Array.isArray(scopeIds) ? scopeIds.map(Number) : [],
                scheduledAt: scheduledAt || null,
                sentBy: req.user.id,
            });
            const isScheduled = result.status === 'SCHEDULED';
            res.json({
                success: true,
                message: isScheduled
                    ? `Đã lên lịch gửi thông báo vào ${new Date(result.scheduledAt).toLocaleString('vi-VN')}`
                    : `Đã gửi thông báo đến ${result.recipientCount} người nhận`,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    // ─── UC-NOTI-06: NOTIFICATION HISTORY ─────────────────────────────────

    // GET /notifications/history
    getNotificationHistory = async (req, res, next) => {
        try {
            const { page = 1, limit = 20, sourceType, sendStatus, fromDate, toDate } = req.query;
            const result = await this.service.getNotificationHistory({
                page: parseInt(page),
                limit: parseInt(limit),
                sourceType,
                sendStatus,
                fromDate,
                toDate,
            });
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    // GET /notifications/history/:id
    getNotificationHistoryDetail = async (req, res, next) => {
        try {
            const detail = await this.service.getNotificationHistoryDetail(parseInt(req.params.id));
            res.json({ success: true, data: detail });
        } catch (error) {
            next(error);
        }
    };
}
