import cron from 'node-cron';
import { TimesheetsService } from '../services/timesheets.service.js';
import { TimesheetsRepository } from '../repositories/timesheets.repository.js';

/**
 * Timesheet Auto-Generate Job
 * 
 * Runs on the 1st of every month at 00:05 AM
 * Automatically generates timesheets for all active employees
 * using data from: employees, attendance_records, holiday_lists,
 * working_shifts, shift_assignments
 */
export function startTimesheetAutoGenerateJob() {
    const timesheetsRepository = new TimesheetsRepository();
    const timesheetsService = new TimesheetsService(timesheetsRepository);

    // Cron: "5 0 1 * *" = minute 5, hour 0, day 1, every month, every weekday
    cron.schedule('5 0 1 * *', async () => {
        const now = new Date();
        const month = now.getMonth() + 1; // current month (1-12)
        const year = now.getFullYear();

        console.log(`[TimesheetJob] Auto-generating timesheets for ${month}/${year}...`);

        try {
            const result = await timesheetsService.generate({ month, year });
            console.log(`[TimesheetJob] ✅ Successfully generated ${result.generated} timesheets for ${month}/${year}`);
            console.log(`[TimesheetJob]    Standard working days: ${result.standardWorkingDays}`);
        } catch (error) {
            console.error(`[TimesheetJob] ❌ Failed to auto-generate timesheets for ${month}/${year}:`, error);
        }
    }, {
        timezone: 'Asia/Ho_Chi_Minh'
    });

    console.log('[TimesheetJob] Scheduled: auto-generate timesheets on 1st of every month at 00:05 (Asia/Ho_Chi_Minh)');
}
