import { AppDataSource } from './database/data-source.js';
import { TimesheetsService } from './services/timesheets.service.js';
import { TimesheetsRepository } from './repositories/timesheets.repository.js';
import { TimeSheetEntity } from './models/entities/time-sheet.entity.js';

async function run() {
    await AppDataSource.initialize();
    const tsService = new TimesheetsService(new TimesheetsRepository());
    const tsRepo = AppDataSource.getRepository(TimeSheetEntity);

    // === Test Employee 18, April 2026 ===
    // Có 1 đơn OT cuối tuần: request 211, ngày 12/04, 4h
    console.log("=== EMPLOYEE 18 — THÁNG 4/2026 ===");
    await tsService.summarizeTimesheet(18, 4, 2026);
    const ts18 = await tsRepo.findOne({ where: { employeeId: 18, month: 4, year: 2026 } });
    console.log({
        overtimeHours: ts18?.overtimeHours,
        otWeekday: ts18?.otWeekday,
        otWeekend: ts18?.otWeekend,
        otHoliday: ts18?.otHoliday,
    });
    const expect18 = parseFloat(ts18?.otWeekend) === 4;
    console.log(expect18 ? "✅ Employee 18: otWeekend = 4" : "❌ Employee 18: SAI");

    // === Test Employee 8, April 2026 ===
    // Có 5 đơn OT ngày thường (overtimeTypeId=1): req 98,99,100,101,102
    // Mỗi đơn 2h → tổng 10h otWeekday
    console.log("\n=== EMPLOYEE 8 — THÁNG 4/2026 ===");
    await tsService.summarizeTimesheet(8, 4, 2026);
    const ts8 = await tsRepo.findOne({ where: { employeeId: 8, month: 4, year: 2026 } });
    console.log({
        overtimeHours: ts8?.overtimeHours,
        otWeekday: ts8?.otWeekday,
        otWeekdayNight: ts8?.otWeekdayNight,
        otWeekend: ts8?.otWeekend,
        otWeekendNight: ts8?.otWeekendNight,
        otHoliday: ts8?.otHoliday,
        otHolidayNight: ts8?.otHolidayNight,
    });
    const expect8 = parseFloat(ts8?.otWeekday) === 10;
    console.log(expect8 ? "✅ Employee 8: otWeekday = 10" : `❌ Employee 8: otWeekday = ${ts8?.otWeekday} (expected 10)`);

    console.log("\n=== KẾT LUẬN ===");
    if (expect18 && expect8) {
        console.log("✅ TẤT CẢ ĐÃ ĐÚNG!");
    } else {
        console.log("❌ CÓ LỖI - CẦN KIỂM TRA LẠI");
    }

    await AppDataSource.destroy();
}

run().catch(e => { console.error(e); process.exit(1); });
