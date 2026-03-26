import cron from 'node-cron';
import { HolidayListService } from '../services/holiday-list.service.js';

export const startHolidayReminderJob = () => {
  // Run every day at 08:00 AM
  cron.schedule('0 8 * * *', async () => {
    try {
      console.log('[Cron Job] Running Holiday Reminder check...');
      const holidayListService = new HolidayListService();
      await holidayListService.processScheduledReminders();
    } catch (error) {
      console.error('[Cron Job] Error in Holiday Reminder job:', error);
    }
  });

  console.log('[Cron Job] Holiday Reminder scheduler started (Daily at 08:00 AM)');
};
