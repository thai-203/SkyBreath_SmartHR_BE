import { AppDataSource } from '../database/data-source.js';
import { NotificationEntity } from '../models/entities/notification.entity.js';
import { NotificationRecipientEntity } from '../models/entities/notification-recipient.entity.js';
import { getIO } from '../config/socket.js';

export class NotificationsService {
    constructor() {
        this.repository = AppDataSource.getRepository(NotificationEntity);
        this.recipientRepository = AppDataSource.getRepository(NotificationRecipientEntity);
    }

    /**
     * Tạo thông báo, lưu DB và emit qua Socket.
     * @param {Object} data  { title, message, notificationType, link, relatedRequestId, recipientUserIds }
     */
    async createAndNotify(data) {
        const { title, message, notificationType = 'WORKFLOW', link, relatedRequestId, recipientUserIds = [] } = data;

        // 1. Lưu thông báo vào DB
        const notification = this.repository.create({
            title,
            message,
            notificationType,
            link: link || null,
            relatedRequestId: relatedRequestId || null,
        });
        const saved = await this.repository.save(notification);

        // 2. Lưu danh sách người nhận
        if (recipientUserIds.length > 0) {
            const recipients = recipientUserIds.map(userId => ({
                notificationId: saved.id,
                userId,
                isRead: false,
            }));
            await this.recipientRepository.save(recipients);
        }

        // 3. Emit real-time qua Socket.io
        const io = getIO();
        if (io) {
            const payload = {
                id: saved.id,
                title: saved.title,
                message: saved.message,
                link: saved.link,
                relatedRequestId: saved.relatedRequestId,
                notificationType: saved.notificationType,
                createdAt: saved.createdAt,
                isRead: false,
            };
            for (const userId of recipientUserIds) {
                io.to(`user_${userId}`).emit('NEW_NOTIFICATION', payload);
            }
        }

        return saved;
    }

    /**
     * Gửi signal REMOVE_PENDING_REQUEST qua socket (không lưu DB).
     */
    emitRemovePendingRequest(userIds, requestId) {
        const io = getIO();
        if (!io) return;
        for (const userId of userIds) {
            io.to(`user_${userId}`).emit('REMOVE_PENDING_REQUEST', { requestId });
        }
    }

    /**
     * Lấy danh sách thông báo của user (phân trang, lọc).
     */
    async getMyNotifications(userId, { page = 1, limit = 20, filter } = {}) {
        const qb = this.recipientRepository
            .createQueryBuilder('nr')
            .leftJoinAndSelect('nr.notification', 'n')
            .where('nr.userId = :userId', { userId })
            .orderBy('n.createdAt', 'DESC');

        if (filter === 'unread') {
            qb.andWhere('nr.isRead = :isRead', { isRead: false });
        } else if (filter === 'read') {
            qb.andWhere('nr.isRead = :isRead', { isRead: true });
        }

        const skip = (page - 1) * limit;
        const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

        return {
            items: items.map(nr => ({
                id: nr.notification.id,
                recipientId: nr.id,
                title: nr.notification.title,
                message: nr.notification.message,
                link: nr.notification.link,
                relatedRequestId: nr.notification.relatedRequestId,
                notificationType: nr.notification.notificationType,
                createdAt: nr.notification.createdAt,
                isRead: nr.isRead,
                readAt: nr.readAt,
            })),
            total,
            page: parseInt(page),
            limit: parseInt(limit),
        };
    }

    /**
     * Đếm số thông báo chưa đọc.
     */
    async getUnreadCount(userId) {
        const count = await this.recipientRepository.count({
            where: { userId, isRead: false },
        });
        return count;
    }

    /**
     * Đánh dấu đã đọc 1 thông báo.
     */
    async markAsRead(notificationId, userId) {
        const recipient = await this.recipientRepository.findOne({
            where: { notificationId, userId },
        });
        if (!recipient) return null;
        recipient.isRead = true;
        recipient.readAt = new Date();
        return await this.recipientRepository.save(recipient);
    }

    /**
     * Đánh dấu tất cả thông báo là đã đọc.
     */
    async markAllAsRead(userId) {
        await this.recipientRepository
            .createQueryBuilder()
            .update(NotificationRecipientEntity)
            .set({ isRead: true, readAt: new Date() })
            .where('userId = :userId AND isRead = false', { userId })
            .execute();
    }
}
