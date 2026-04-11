import { AppDataSource } from '../database/data-source.js';
import { NotificationEntity } from '../models/entities/notification.entity.js';
import { NotificationRecipientEntity } from '../models/entities/notification-recipient.entity.js';
import { UserEntity } from '../models/entities/user.entity.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { getIO } from '../config/socket.js';
import { NotificationsRepository } from '../repositories/notifications.repository.js';
import {
    NotificationSourceType,
    NotificationSendStatus,
    NotificationDeliveryStatus,
} from '../common/enums/notification.enum.js';

export class NotificationsService {
    constructor() {
        this.repository = AppDataSource.getRepository(NotificationEntity);
        this.recipientRepository = AppDataSource.getRepository(NotificationRecipientEntity);
        this.notifRepo = new NotificationsRepository();
    }

    /**
     * Tạo thông báo, lưu DB và emit qua Socket.
     * @param {Object} data { title, message, notificationType, link, relatedRequestId, recipientUserIds, sourceType, sentBy }
     */
    async createAndNotify(data) {
        const {
            title,
            message,
            notificationType = 'WORKFLOW',
            link,
            relatedRequestId,
            recipientUserIds = [],
            sourceType = NotificationSourceType.WORKFLOW,
            sentBy = null,
            recipientScope = null,
            recipientScopeIds = null,
        } = data;

        // 1. Lưu thông báo vào DB
        const notification = this.repository.create({
            title,
            message,
            notificationType,
            link: link || null,
            relatedRequestId: relatedRequestId || null,
            sourceType,
            sentBy,
            sendStatus: NotificationSendStatus.SENT,
            sentAt: new Date(),
            recipientScope,
            recipientScopeIds: recipientScopeIds ? JSON.stringify(recipientScopeIds) : null,
        });
        const saved = await this.repository.save(notification);

        // 2. Lưu danh sách người nhận
        if (recipientUserIds.length > 0) {
            const recipients = recipientUserIds.map(userId => ({
                notificationId: saved.id,
                userId,
                isRead: false,
                deliveryStatus: NotificationDeliveryStatus.PENDING,
            }));
            await this.recipientRepository.save(recipients);
        }

        // 3. Emit real-time qua Socket.io
        await this._emitToUsers(saved, recipientUserIds);

        // 4. Update delivery status thành DELIVERED
        if (recipientUserIds.length > 0) {
            await this.notifRepo.updateRecipientDelivery(saved.id, NotificationDeliveryStatus.DELIVERED);
        }

        return saved;
    }

    /**
     * Emit socket tới danh sách user
     */
    async _emitToUsers(notification, userIds) {
        const io = getIO();
        if (!io || !userIds.length) return;

        const payload = {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            link: notification.link,
            relatedRequestId: notification.relatedRequestId,
            notificationType: notification.notificationType,
            sourceType: notification.sourceType,
            createdAt: notification.createdAt,
            isRead: false,
        };
        for (const userId of userIds) {
            io.to(`user_${userId}`).emit('NEW_NOTIFICATION', payload);
        }
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

    // ─── UC-NOTI-05: MANUAL NOTIFICATION ──────────────────────────────────

    /**
     * Resolve danh sách userId từ recipientScope
     * @param {'ALL'|'DEPARTMENT'|'USERS'} scope
     * @param {number[]} scopeIds - department IDs hoặc user IDs
     */
    async _resolveRecipientUserIds(scope, scopeIds = []) {
        const userRepo = AppDataSource.getRepository(UserEntity);
        const employeeRepo = AppDataSource.getRepository(EmployeeEntity);

        if (scope === 'ALL') {
            const users = await userRepo.find({ where: { status: 'ACTIVE', isDeleted: false }, select: ['id'] });
            return users.map(u => u.id);
        }

        if (scope === 'DEPARTMENT') {
            if (!scopeIds.length) return [];
            const employees = await employeeRepo
                .createQueryBuilder('e')
                .innerJoin('e.user', 'u')
                .where('e.departmentId IN (:...deptIds)', { deptIds: scopeIds })
                .andWhere('u.status = :status', { status: 'ACTIVE' })
                .andWhere('u.isDeleted = false')
                .select('e.userId', 'userId')
                .getRawMany();
            return [...new Set(employees.map(e => e.userId))];
        }

        if (scope === 'USERS') {
            return [...new Set(scopeIds)];
        }

        return [];
    }

    /**
     * Gửi thông báo thủ công — UC-NOTI-05
     */
    async sendManualNotification({ title, message, recipientScope, scopeIds = [], scheduledAt, sentBy }) {
        // Validate
        if (!title?.trim()) throw new Error('Tiêu đề không được để trống');
        if (!message?.trim()) throw new Error('Nội dung không được để trống');
        if (!['ALL', 'DEPARTMENT', 'USERS'].includes(recipientScope)) {
            throw new Error('Phạm vi người nhận không hợp lệ');
        }
        if (recipientScope !== 'ALL' && !scopeIds.length) {
            throw new Error('Phải chọn ít nhất một phòng ban hoặc người nhận');
        }

        const isScheduled = !!scheduledAt;

        if (isScheduled) {
            // Gửi theo lịch: lưu vào DB với status SCHEDULED, chưa gửi ngay
            const notification = this.repository.create({
                title: title.trim(),
                message: message.trim(),
                notificationType: 'MANUAL',
                sourceType: NotificationSourceType.MANUAL,
                sentBy,
                sendStatus: NotificationSendStatus.SCHEDULED,
                scheduledAt: new Date(scheduledAt),
                recipientScope,
                recipientScopeIds: scopeIds.length ? JSON.stringify(scopeIds) : null,
            });
            const saved = await this.repository.save(notification);
            return { id: saved.id, status: NotificationSendStatus.SCHEDULED, scheduledAt: saved.scheduledAt };
        }

        // Gửi ngay
        const recipientUserIds = await this._resolveRecipientUserIds(recipientScope, scopeIds);
        if (!recipientUserIds.length) {
            throw new Error('Không tìm thấy người nhận hợp lệ theo phạm vi đã chọn');
        }

        await this.createAndNotify({
            title: title.trim(),
            message: message.trim(),
            notificationType: 'MANUAL',
            sourceType: NotificationSourceType.MANUAL,
            sentBy,
            recipientUserIds,
            recipientScope,
            recipientScopeIds: scopeIds,
        });

        return { recipientCount: recipientUserIds.length, status: NotificationSendStatus.SENT };
    }

    /**
     * Xử lý các thông báo hẹn giờ đã đến hạn (dùng bởi cron job)
     */
    async processPendingScheduledNotifications() {
        const pending = await this.notifRepo.findScheduledPending();
        if (!pending.length) return;

        for (const notif of pending) {
            try {
                const scopeIds = notif.recipientScopeIds ? JSON.parse(notif.recipientScopeIds) : [];
                const recipientUserIds = await this._resolveRecipientUserIds(notif.recipientScope, scopeIds);

                if (recipientUserIds.length > 0) {
                    const recipients = recipientUserIds.map(userId => ({
                        notificationId: notif.id,
                        userId,
                        isRead: false,
                        deliveryStatus: NotificationDeliveryStatus.PENDING,
                    }));
                    await this.recipientRepository.save(recipients);
                    await this._emitToUsers(notif, recipientUserIds);
                    await this.notifRepo.updateRecipientDelivery(notif.id, NotificationDeliveryStatus.DELIVERED);
                }

                // Cập nhật trạng thái notification thành SENT
                await this.repository.update(notif.id, {
                    sendStatus: NotificationSendStatus.SENT,
                    sentAt: new Date(),
                });
            } catch (err) {
                console.error(`[Scheduled Notification] Failed to send notif #${notif.id}:`, err);
                await this.repository.update(notif.id, {
                    sendStatus: NotificationSendStatus.FAILED,
                });
            }
        }
    }

    // ─── UC-NOTI-06: NOTIFICATION HISTORY ─────────────────────────────────

    async getNotificationHistory({ page = 1, limit = 20, sourceType, sendStatus, fromDate, toDate } = {}) {
        return await this.notifRepo.findHistory({ page, limit, sourceType, sendStatus, fromDate, toDate });
    }

    async getNotificationHistoryDetail(id) {
        const detail = await this.notifRepo.findHistoryById(id);
        if (!detail) throw new Error('Không tìm thấy bản ghi thông báo');
        return detail;
    }

    // ─── CÁC METHOD CŨ (giữ nguyên) ───────────────────────────────────────

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
                sourceType: nr.notification.sourceType,
                createdAt: nr.notification.createdAt,
                isRead: nr.isRead,
                readAt: nr.readAt,
            })),
            total,
            page: parseInt(page),
            limit: parseInt(limit),
        };
    }

    async getUnreadCount(userId) {
        const count = await this.recipientRepository.count({
            where: { userId, isRead: false },
        });
        return count;
    }

    async markAsRead(notificationId, userId) {
        const recipient = await this.recipientRepository.findOne({
            where: { notificationId, userId },
        });
        if (!recipient) return null;
        recipient.isRead = true;
        recipient.readAt = new Date();
        return await this.recipientRepository.save(recipient);
    }

    async markAllAsRead(userId) {
        await this.recipientRepository
            .createQueryBuilder()
            .update(NotificationRecipientEntity)
            .set({ isRead: true, readAt: new Date() })
            .where('userId = :userId AND isRead = false', { userId })
            .execute();
    }
}
