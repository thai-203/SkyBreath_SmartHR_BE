import { AppDataSource } from './database/data-source.js';
import { PayrollService } from './services/payroll.service.js';
import { PayrollRepository } from './repositories/payroll.repository.js';
import { PayrollDetailRepository } from './repositories/payroll-detail.repository.js';

async function run() {
    await AppDataSource.initialize();
    try {
        const ps = new PayrollService(new PayrollRepository(), new PayrollDetailRepository());

        // Test _calcPIT theo biểu thuế lũy tiến 7 bậc
        console.log("=== KIỂM TRA BIỂU THUẾ LŨY TIẾN ===");
        // Thu nhập tính thuế 5 triệu → 5tr×5% = 250,000
        console.log("5tr:", ps._calcPIT(5_000_000), "expect:", 250_000);
        // 10tr → 5tr×5% + 5tr×10% = 250k + 500k = 750,000
        console.log("10tr:", ps._calcPIT(10_000_000), "expect:", 750_000);
        // 18tr → 750k + 8tr×15% = 750k + 1,200k = 1,950,000
        console.log("18tr:", ps._calcPIT(18_000_000), "expect:", 1_950_000);
        // 32tr → 1,950k + 14tr×20% = 1,950k + 2,800k = 4,750,000
        console.log("32tr:", ps._calcPIT(32_000_000), "expect:", 4_750_000);

        // Test _calcTaxableIncome có trừ BHXH
        console.log("\n=== KIỂM TRA THU NHẬP TÍNH THUẾ ===");
        const gross = 30_000_000;
        const insurance = 3_150_000; // 10.5% × 30tr
        const family = 15_500_000; // bản thân, 0 NPT
        const taxable = ps._calcTaxableIncome(gross, insurance, family);
        console.log(`Gross ${gross} - BHXH ${insurance} - GTGC ${family} = Taxable ${taxable}`);
        console.log("expect:", gross - insurance - family, "=", 11_350_000);

        // Test autoCalculate
        console.log("\n=== GỌI autoCalculate CHO PAYROLL 5 ===");
        const result = await ps.autoCalculate(5);

        // Employee 8
        const emp8 = result.details.find(d => d.employeeId === 8);
        if (emp8) {
            console.log("\n=== EMPLOYEE 8 ===");
            console.log({
                totalGrossIncome: emp8.totalGrossIncome,
                insuranceDeduction: emp8.insuranceDeduction,
                familyDeduction: emp8.familyDeduction,
                taxableIncomePaid: emp8.taxableIncomePaid,
                taxDeduction: emp8.taxDeduction,
                totalDeduction: emp8.totalDeduction,
                netSalary: emp8.netSalary,
                overtimePay: emp8.overtimePay,
            });
        }

        // Employee 18
        const emp18 = result.details.find(d => d.employeeId === 18);
        if (emp18) {
            console.log("\n=== EMPLOYEE 18 ===");
            console.log({
                totalGrossIncome: emp18.totalGrossIncome,
                insuranceDeduction: emp18.insuranceDeduction,
                familyDeduction: emp18.familyDeduction,
                taxableIncomePaid: emp18.taxableIncomePaid,
                taxDeduction: emp18.taxDeduction,
                totalDeduction: emp18.totalDeduction,
                netSalary: emp18.netSalary,
                overtimePay: emp18.overtimePay,
            });
        }

    } catch (e) {
        console.error(e);
    } finally {
        await AppDataSource.destroy();
    }
}

run();
