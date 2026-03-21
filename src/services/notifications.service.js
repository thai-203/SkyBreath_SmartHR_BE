import { AppDataSource } from '../database/data-source.js';
import { NotificationEntity } from '../models/entities/notification.entity.js';
import { NotificationRecipientEntity } from '../models/entities/notification-recipient.entity.js';

export class NotificationsService {
    constructor() {
        this.repository = AppDataSource.getRepository(NotificationEntity);
        this.recipientRepository = AppDataSource.getRepository(NotificationRecipientEntity);
    }

    async createNotification(data) {
        const { title, message, notificationType, recipientIds } = data;

        const notification = this.repository.create({
            title,
            message,
            notificationType
        });

        const savedNotification = await this.repository.save(notification);

        if (recipientIds && recipientIds.length > 0) {
            const recipients = recipientIds.map(userId => ({
                notificationId: savedNotification.id,
                userId: userId,
                isRead: false
            }));
            await this.recipientRepository.save(recipients);
        }

        return savedNotification;
    }
}
