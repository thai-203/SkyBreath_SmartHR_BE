import cron from 'node-cron';
import { TimesheetsService } from '../services/timesheets.service.js';
import { TimesheetsRepository } from '../repositories/timesheets.repository.js';
import { AppDataSource } from '../database/data-source.js';
import { TimeSheetEntity } from '../models/entities/time-sheet.entity.js';

/**
 * Attendance Sync Job
 * 
 * Runs daily at 23:30 to recalculate all UNLOCKED timesheets
 * for the current month. This ensures timesheet totals stay
 * in sync with the latest attendance_records data.
 */
export function startAttendanceSyncJob() {
    const timesheetsRepository = new TimesheetsRepository();
    const timesheetsService = new TimesheetsService(timesheetsRepository);

    // Cron: "30 23 * * *" = 23:30 every day
    cron.schedule('30 23 * * *', async () => {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        console.log(`[AttendanceSyncJob] Syncing timesheets for ${month}/${year}...`);

        try {
            // Find all unlocked timesheets for the current month
            const timesheetRepo = AppDataSource.getRepository(TimeSheetEntity);
            const unlockedTimesheets = await timesheetRepo.find({
                where: {
                    month,
                    year,
                    isLocked: false,
                    isDeleted: false,
                },
            });

            if (unlockedTimesheets.length === 0) {
                console.log(`[AttendanceSyncJob] No unlocked timesheets found for ${month}/${year}. Skipping.`);
                return;
            }

            let successCount = 0;
            let errorCount = 0;

            for (const timesheet of unlockedTimesheets) {
                try {
                    await timesheetsService.recalculate(timesheet.id, null);
                    successCount++;
                } catch (error) {
                    errorCount++;
                    console.error(`[AttendanceSyncJob] Failed to recalculate timesheet #${timesheet.id} (employee: ${timesheet.employeeId}):`, error.message);
                }
            }

            console.log(`[AttendanceSyncJob] ✅ Sync completed for ${month}/${year}: ${successCount} synced, ${errorCount} errors (total: ${unlockedTimesheets.length})`);
        } catch (error) {
            console.error(`[AttendanceSyncJob] ❌ Failed to sync attendance for ${month}/${year}:`, error);
        }
    }, {
        timezone: 'Asia/Ho_Chi_Minh'
    });

    console.log('[AttendanceSyncJob] Scheduled: daily attendance sync at 23:30 (Asia/Ho_Chi_Minh)');
}
