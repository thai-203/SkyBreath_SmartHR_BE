import cron from 'node-cron';
import { NotificationsService } from '../services/notifications.service.js';

export const startScheduledNotificationJob = () => {
    // Chạy mỗi phút để kiểm tra thông báo hẹn giờ đến hạn
    cron.schedule('* * * * *', async () => {
        try {
            const service = new NotificationsService();
            await service.processPendingScheduledNotifications();
        } catch (error) {
            console.error('[Cron Job] Error in Scheduled Notification job:', error);
        }
    });

    console.log('[Cron Job] Scheduled Notification dispatcher started (every minute)');
};
