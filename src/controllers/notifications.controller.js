import { NotificationsService } from '../services/notifications.service.js';

export class NotificationsController {
    constructor() {
        this.service = new NotificationsService();
    }

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
}
