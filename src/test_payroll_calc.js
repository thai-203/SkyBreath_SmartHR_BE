import { AppDataSource } from './database/data-source.js';
import { PayrollService } from './services/payroll.service.js';
import { PayrollRepository } from './repositories/payroll.repository.js';
import { PayrollDetailRepository } from './repositories/payroll-detail.repository.js';

async function run() {
    await AppDataSource.initialize();
    try {
        const payrollService = new PayrollService(
            new PayrollRepository(),
            new PayrollDetailRepository()
        );

        console.log("=== GỌI autoCalculate CHO PAYROLL 5 ===");
        const result = await payrollService.autoCalculate(5);

        // Tìm kết quả cho employee 8
        const emp8 = result.details.find(d => d.employeeId === 8);
        const emp18 = result.details.find(d => d.employeeId === 18);

        console.log("\n=== EMPLOYEE 8 (Tháng 4/2026) ===");
        if (emp8) {
            console.log({
                otWeekday: emp8.otWeekday,
                otWeekend: emp8.otWeekend,
                totalOtHours: emp8.totalOtHours,
                overtimePay: emp8.overtimePay,
            });
            const ok8 = parseFloat(emp8.otWeekday) === 10 && parseFloat(emp8.overtimePay) > 0;
            console.log(ok8 ? "✅ Employee 8: OT ĐÚNG" : "❌ Employee 8: OT SAI");
        } else {
            console.log("⚠️ Employee 8 không có trong payroll 5");
        }

        console.log("\n=== EMPLOYEE 18 (Tháng 4/2026) ===");
        if (emp18) {
            console.log({
                otWeekday: emp18.otWeekday,
                otWeekend: emp18.otWeekend,
                totalOtHours: emp18.totalOtHours,
                overtimePay: emp18.overtimePay,
            });
            const ok18 = parseFloat(emp18.otWeekend) === 4 && parseFloat(emp18.overtimePay) > 0;
            console.log(ok18 ? "✅ Employee 18: OT ĐÚNG" : "❌ Employee 18: OT SAI");
        } else {
            console.log("⚠️ Employee 18 không có trong payroll 5");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await AppDataSource.destroy();
    }
}

run();
