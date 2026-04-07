import { AppDataSource } from '../database/data-source.js';
import { NotificationEntity } from '../models/entities/notification.entity.js';
import { NotificationRecipientEntity } from '../models/entities/notification-recipient.entity.js';
import { NotificationSendStatus } from '../common/enums/notification.enum.js';

export class NotificationsRepository {
    get repo() {
        if (!this._repo) this._repo = AppDataSource.getRepository(NotificationEntity);
        return this._repo;
    }

    get recipientRepo() {
        if (!this._recipientRepo) this._recipientRepo = AppDataSource.getRepository(NotificationRecipientEntity);
        return this._recipientRepo;
    }

    /**
     * Lấy lịch sử gửi thông báo (tất cả loại) — cho UC-NOTI-06
     */
    async findHistory({ page = 1, limit = 20, sourceType, sendStatus, fromDate, toDate } = {}) {
        const skip = (page - 1) * limit;

        const qb = this.repo
            .createQueryBuilder('n')
            .where('n.isDeleted = false');

        if (sourceType) qb.andWhere('n.sourceType = :sourceType', { sourceType });
        if (sendStatus) qb.andWhere('n.sendStatus = :sendStatus', { sendStatus });
        if (fromDate) qb.andWhere('n.createdAt >= :fromDate', { fromDate });
        if (toDate) qb.andWhere('n.createdAt <= :toDate', { toDate });

        const [items, total] = await qb
            .orderBy('n.createdAt', 'DESC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        // Đếm số người nhận cho mỗi notification
        const ids = items.map(n => n.id);
        let recipientCounts = {};
        if (ids.length > 0) {
            const counts = await this.recipientRepo
                .createQueryBuilder('nr')
                .select('nr.notificationId', 'notificationId')
                .addSelect('COUNT(nr.id)', 'count')
                .where('nr.notificationId IN (:...ids)', { ids })
                .groupBy('nr.notificationId')
                .getRawMany();
            counts.forEach(c => {
                recipientCounts[c.notificationId] = parseInt(c.count, 10);
            });
        }

        return {
            items: items.map(n => ({
                id: n.id,
                title: n.title,
                message: n.message,
                notificationType: n.notificationType,
                sourceType: n.sourceType,
                sendStatus: n.sendStatus,
                sentBy: n.sentBy,
                scheduledAt: n.scheduledAt,
                sentAt: n.sentAt,
                recipientScope: n.recipientScope,
                recipientCount: recipientCounts[n.id] || 0,
                createdAt: n.createdAt,
            })),
            total,
            page: parseInt(page),
            limit: parseInt(limit),
        };
    }

    /**
     * Chi tiết một bản ghi lịch sử kèm danh sách người nhận
     */
    async findHistoryById(id) {
        const notification = await this.repo.findOne({
            where: { id, isDeleted: false },
        });
        if (!notification) return null;

        const recipients = await this.recipientRepo.find({
            where: { notificationId: id },
            relations: ['user'],
            order: { createdAt: 'ASC' },
        });

        return {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            notificationType: notification.notificationType,
            sourceType: notification.sourceType,
            sendStatus: notification.sendStatus,
            sentBy: notification.sentBy,
            scheduledAt: notification.scheduledAt,
            sentAt: notification.sentAt,
            recipientScope: notification.recipientScope,
            recipientScopeIds: notification.recipientScopeIds,
            createdAt: notification.createdAt,
            recipients: recipients.map(r => ({
                userId: r.userId,
                username: r.user?.username,
                email: r.user?.email,
                isRead: r.isRead,
                readAt: r.readAt,
                deliveryStatus: r.deliveryStatus,
            })),
        };
    }

    /**
     * Lấy các thông báo hẹn giờ chưa gửi (dùng cho scheduled job)
     */
    async findScheduledPending() {
        const now = new Date();
        return await this.repo
            .createQueryBuilder('n')
            .where('n.sendStatus = :status', { status: NotificationSendStatus.SCHEDULED })
            .andWhere('n.scheduledAt <= :now', { now })
            .andWhere('n.isDeleted = false')
            .getMany();
    }

    async findById(id) {
        return await this.repo.findOne({ where: { id, isDeleted: false } });
    }

    async save(entity) {
        return await this.repo.save(entity);
    }

    async saveRecipients(recipients) {
        return await this.recipientRepo.save(recipients);
    }

    async updateRecipientDelivery(notificationId, deliveryStatus) {
        await this.recipientRepo
            .createQueryBuilder()
            .update(NotificationRecipientEntity)
            .set({ deliveryStatus })
            .where('notificationId = :notificationId', { notificationId })
            .execute();
    }
}
