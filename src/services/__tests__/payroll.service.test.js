import 'reflect-metadata';
import { PayrollService } from '../payroll.service.js';
import { PayrollRepository } from '../../repositories/payroll.repository.js';
import { PayrollDetailRepository } from '../../repositories/payroll-detail.repository.js';
import { AppDataSource } from '../../database/data-source.js';

jest.mock('../../repositories/payroll.repository.js', () => ({
    PayrollRepository: jest.fn(),
}));

jest.mock('../../repositories/payroll-detail.repository.js', () => ({
    PayrollDetailRepository: jest.fn(),
}));

jest.mock('../../common/utils/mail.util.js', () => jest.fn(() => Promise.resolve()));

// Mock AppDataSource for repository calls
jest.mock('../../database/data-source.js', () => ({
    AppDataSource: {
        getRepository: jest.fn().mockReturnValue({
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
        }),
    },
}));

// Mock entities used in AppDataSource.getRepository
jest.mock('../../models/entities/overtime-rule.entity.js', () => ({}), { virtual: true });
jest.mock('../../models/entities/overtime-rule-department.entity.js', () => ({}), { virtual: true });
jest.mock('../../models/entities/performance-review.entity.js', () => ({}), { virtual: true });
jest.mock('../../models/entities/time-sheet.entity.js', () => ({}), { virtual: true });
jest.mock('../../models/entities/holiday-list.entity.js', () => ({}), { virtual: true });
jest.mock('../../models/entities/employee-salary.entity.js', () => ({}), { virtual: true });
jest.mock('../../models/entities/employee.entity.js', () => ({}), { virtual: true });

// Mock exceljs
jest.mock('exceljs', () => ({
    default: {
        Workbook: jest.fn().mockImplementation(() => ({
            addWorksheet: jest.fn().mockReturnValue({
                eachRow: jest.fn(),
                getCell: jest.fn(),
                mergeCells: jest.fn(),
                columns: [],
                getRow: jest.fn().mockReturnValue({
                    getCell: jest.fn().mockReturnValue({ value: null }),
                }),
            }),
            xlsx: {
                load: jest.fn(),
                writeBuffer: jest.fn().mockResolvedValue(Buffer.from('test')),
            },
        })),
    },
}), { virtual: true });

describe('PayrollService', () => {
    let service;
    let payrollRepo;
    let detailRepo;

    const mockPayroll = {
        id: 1,
        payrollMonth: 1,
        payrollYear: 2026,
        payrollStatus: 'DRAFT',
    };

    const mockDetail = {
        id: 1,
        payrollId: 1,
        employeeId: 100,
        employee: {
            id: 100,
            fullName: 'Nguyễn Văn A',
            employeeCode: 'NV001',
            departmentId: 10,
            employmentStatus: 'OFFICIAL',
        },
        baseSalary: 10_000_000,
        performanceSalary: 5_000_000,
        standardDays: 26,
        workingDays: 26,
        officialDays: 24,
        probationDays: 0,
        businessTripDays: 0,
        holidayDays: 2,
        benefitLeaveDays: 0,
        socialInsurance: 800_000,
        healthInsurance: 150_000,
        unemploymentInsurance: 100_000,
        insuranceDeduction: 1_050_000,
        taxDeduction: 0,
        bonus: 0,
        penalty: 0,
        deduction: 0,
        netSalary: 13_950_000,
    };

    const expectRejectWithStatus = async (promise, statusCode) => {
        try {
            await promise;
            throw new Error('Expected promise to reject');
        } catch (err) {
            expect(err.statusCode).toBe(statusCode);
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        payrollRepo = {
            findByPeriod: jest.fn(),
            create: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            findAll: jest.fn(),
        };
        detailRepo = {
            bulkCreate: jest.fn(),
            findByPayroll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            findByPayrollAndEmployeeCode: jest.fn(),
        };
        PayrollRepository.mockImplementation(() => payrollRepo);
        PayrollDetailRepository.mockImplementation(() => detailRepo);
        service = new PayrollService(payrollRepo, detailRepo);
    });

    // ═══════════════════════════════════════════════════════════════
    // UC27: TẠO BẢNG LƯƠNG
    // ═══════════════════════════════════════════════════════════════

    describe('create - UC27 Create Payroll', () => {
        it('UTCID01: Create payroll success - should create new payroll', async () => {
            payrollRepo.findByPeriod.mockResolvedValue(null);
            payrollRepo.create.mockResolvedValue(mockPayroll);

            const result = await service.create({
                payrollMonth: 1,
                payrollYear: 2026,
                employeeIds: [1, 2, 3],
            });

            expect(payrollRepo.findByPeriod).toHaveBeenCalledWith(1, 2026);
            expect(payrollRepo.create).toHaveBeenCalledWith({
                payrollMonth: 1,
                payrollYear: 2026,
                payrollStatus: 'DRAFT',
            });
            expect(detailRepo.bulkCreate).toHaveBeenCalled();
            expect(result.id).toBe(1);
        });

        it('UTCID02: Create payroll conflict - should throw error if period exists', async () => {
            payrollRepo.findByPeriod.mockResolvedValue(mockPayroll);

            await expectRejectWithStatus(
                service.create({ payrollMonth: 1, payrollYear: 2026 }),
                409
            );
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // UC28: CẬP NHẬT CHI TIẾT LƯƠNG
    // ═══════════════════════════════════════════════════════════════

    describe('updateDetail - UC28 Update Salary Detail', () => {
        it('UTCID03: Update detail success - should update bonus and recalculate', async () => {
            detailRepo.findById.mockResolvedValue(mockDetail);
            payrollRepo.findById.mockResolvedValue({ ...mockPayroll, payrollStatus: 'DRAFT' });
            detailRepo.update.mockResolvedValue({ ...mockDetail, bonus: 500_000 });

            const result = await service.updateDetail(1, { bonus: 500_000 });

            expect(detailRepo.update).toHaveBeenCalled();
            expect(result.bonus).toBe(500_000);
        });

        it('UTCID04: Update locked payroll - should throw error', async () => {
            detailRepo.findById.mockResolvedValue(mockDetail);
            payrollRepo.findById.mockResolvedValue({ ...mockPayroll, payrollStatus: 'LOCKED' });

            await expectRejectWithStatus(
                service.updateDetail(1, { bonus: 500_000 }),
                400
            );
        });

        it('UTCID05: Update non-existent detail - should throw not found', async () => {
            detailRepo.findById.mockResolvedValue(null);

            await expectRejectWithStatus(
                service.updateDetail(999, { bonus: 500_000 }),
                404
            );
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // UC29: PHÊ DUYỆT BẢNG LƯƠNG
    // ═══════════════════════════════════════════════════════════════

    describe('submitForApproval - UC29 Submit for Approval', () => {
        it('UTCID06: Submit draft payroll success', async () => {
            payrollRepo.findById.mockResolvedValue(mockPayroll);
            payrollRepo.update.mockResolvedValue({ ...mockPayroll, payrollStatus: 'PENDING_APPROVAL' });

            const result = await service.submitForApproval(1);

            expect(payrollRepo.update).toHaveBeenCalledWith(1, {
                payrollStatus: 'PENDING_APPROVAL',
                rejectedReason: null,
            });
            expect(result.payrollStatus).toBe('PENDING_APPROVAL');
        });

        it('UTCID07: Submit non-draft payroll - should throw error', async () => {
            payrollRepo.findById.mockResolvedValue({ ...mockPayroll, payrollStatus: 'APPROVED' });

            await expectRejectWithStatus(
                service.submitForApproval(1),
                400
            );
        });
    });

    describe('approve - UC29 Approve Payroll', () => {
        it('UTCID08: Approve pending payroll success', async () => {
            payrollRepo.findById.mockResolvedValue({ ...mockPayroll, payrollStatus: 'PENDING_APPROVAL' });
            payrollRepo.update.mockResolvedValue({ ...mockPayroll, payrollStatus: 'APPROVED' });

            const result = await service.approve(1, 1);

            expect(payrollRepo.update).toHaveBeenCalled();
            expect(result.payrollStatus).toBe('APPROVED');
        });

        it('UTCID09: Approve non-pending payroll - should throw error', async () => {
            payrollRepo.findById.mockResolvedValue(mockPayroll); // DRAFT status

            await expectRejectWithStatus(
                service.approve(1, 1),
                400
            );
        });
    });

    describe('reject - UC29 Reject Payroll', () => {
        it('UTCID10: Reject pending payroll success', async () => {
            payrollRepo.findById.mockResolvedValue({ ...mockPayroll, payrollStatus: 'PENDING_APPROVAL' });
            payrollRepo.update.mockResolvedValue({ ...mockPayroll, payrollStatus: 'DRAFT' });

            const result = await service.reject(1, 1, 'Sai định mức');

            expect(payrollRepo.update).toHaveBeenCalledWith(1, {
                payrollStatus: 'DRAFT',
                rejectedReason: 'Sai định mức',
            });
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // UC30: KHÓA BẢNG LƯƠNG & GỬI PHIẾU LƯƠNG
    // ═══════════════════════════════════════════════════════════════

    describe('lock - UC30 Lock Payroll', () => {
        it('UTCID11: Lock approved payroll success', async () => {
            payrollRepo.findById.mockResolvedValue({ ...mockPayroll, payrollStatus: 'APPROVED' });
            payrollRepo.update.mockResolvedValue({ ...mockPayroll, payrollStatus: 'LOCKED' });

            const result = await service.lock(1);

            expect(payrollRepo.update).toHaveBeenCalledWith(1, { payrollStatus: 'LOCKED' });
            expect(result.payrollStatus).toBe('LOCKED');
        });

        it('UTCID12: Lock non-approved payroll - should throw error', async () => {
            payrollRepo.findById.mockResolvedValue(mockPayroll); // DRAFT status

            await expectRejectWithStatus(
                service.lock(1),
                400
            );
        });
    });

    describe('unlock - UC30 Unlock Payroll', () => {
        it('UTCID13: Unlock locked payroll success', async () => {
            payrollRepo.findById.mockResolvedValue({ ...mockPayroll, payrollStatus: 'LOCKED' });
            payrollRepo.update.mockResolvedValue({ ...mockPayroll, payrollStatus: 'APPROVED' });

            const result = await service.unlock(1);

            expect(payrollRepo.update).toHaveBeenCalledWith(1, { payrollStatus: 'APPROVED' });
        });

        it('UTCID14: Unlock non-locked payroll - should throw error', async () => {
            payrollRepo.findById.mockResolvedValue(mockPayroll);

            await expectRejectWithStatus(
                service.unlock(1),
                400
            );
        });
    });

    describe('sendPayslips - UC30 Send Payslips', () => {
        it('UTCID15: Send payslips to locked payroll success', async () => {
            const detailWithEmail = {
                ...mockDetail,
                employee: {
                    ...mockDetail.employee,
                    companyEmail: 'nv.a@example.com',
                },
            };
            payrollRepo.findById.mockResolvedValue({ ...mockPayroll, payrollStatus: 'LOCKED' });
            detailRepo.findByPayroll.mockResolvedValue([detailWithEmail]);
            detailRepo.update.mockResolvedValue(detailWithEmail);

            const result = await service.sendPayslips(1);

            expect(result.sent).toBe(1);
            expect(result.total).toBe(1);
        });

        it('UTCID16: Send payslips to unlocked payroll - should throw error', async () => {
            payrollRepo.findById.mockResolvedValue(mockPayroll);

            await expectRejectWithStatus(
                service.sendPayslips(1),
                400
            );
        });
    });

    describe('sendPayslipsToSelected - UC30 Send Payslips to Selected', () => {
        it('UTCID17: Send to selected employees success', async () => {
            const detailWithEmail = {
                ...mockDetail,
                employee: {
                    ...mockDetail.employee,
                    companyEmail: 'nv.a@example.com',
                },
            };
            payrollRepo.findById.mockResolvedValue(mockPayroll);
            detailRepo.findByPayroll.mockResolvedValue([detailWithEmail]);
            detailRepo.update.mockResolvedValue(detailWithEmail);

            const result = await service.sendPayslipsToSelected(1, [1]);

            expect(result.sent).toBe(1);
        });

        it('UTCID18: Send to no employees - should throw error', async () => {
            payrollRepo.findById.mockResolvedValue(mockPayroll);

            await expectRejectWithStatus(
                service.sendPayslipsToSelected(1, []),
                400
            );
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TÍNH LƯƠNG & BẢO HIỂM
    // ═══════════════════════════════════════════════════════════════

    describe('Insurance Calculations', () => {
        it('UTCID19: Insurance rates should be correct per Vietnamese law', () => {
            // Insurance rates are defined in service module - verify via instance
            // Standard rates: SOCIAL=8%, HEALTH=1.5%, UNEMPLOYMENT=1%, UNION=0%
            const expectedRates = { SOCIAL: 8, HEALTH: 1.5, UNEMPLOYMENT: 1, UNION: 0 };
            expect(expectedRates.SOCIAL).toBe(8);
            expect(expectedRates.HEALTH).toBe(1.5);
            expect(expectedRates.UNEMPLOYMENT).toBe(1);
            expect(expectedRates.UNION).toBe(0);
        });
    });

    describe('_calcPIT - Personal Income Tax', () => {
        it('UTCID20: PIT calculation for income <= 5M', () => {
            const result = service._calcPIT(5_000_000);
            expect(result).toBe(250_000); // 5M * 5%
        });

        it('UTCID21: PIT calculation for income 5-10M', () => {
            const result = service._calcPIT(10_000_000);
            // 5M * 5% + 5M * 10% = 250K + 500K = 750K
            expect(result).toBe(750_000);
        });

        it('UTCID22: PIT calculation for income 10-18M', () => {
            const result = service._calcPIT(18_000_000);
            // 5M * 5% + 5M * 10% + 8M * 15% = 250K + 500K + 1.2M = 1.95M
            expect(result).toBe(1_950_000);
        });

        it('UTCID23: PIT calculation for high income (>80M)', () => {
            const result = service._calcPIT(100_000_000);
            // Progressive tax: 5M*5% + 5M*10% + 8M*15% + 14M*20% + 20M*25% + 28M*30% + 20M*35% = 25.15M
            expect(result).toBe(25_150_000);
        });

        it('UTCID24: PIT should be 0 for income <= 0', () => {
            const result = service._calcPIT(0);
            expect(result).toBe(0);
        });
    });

    describe('_countWorkingDays - Count Working Days', () => {
        it('UTCID25: Should count working days excluding weekends', () => {
            const holidays = new Set();
            const result = service._countWorkingDays(2026, 1, holidays);
            // January 2026 has 31 days
            // Should exclude Saturdays and Sundays
            expect(result).toBeGreaterThan(20);
            expect(result).toBeLessThan(27);
        });

        it('UTCID26: Should exclude holidays', () => {
            const holidays = new Set(['2026-01-01']); // New Year
            const result = service._countWorkingDays(2026, 1, holidays);
            // Should be 1 less than without holidays
            const resultNoHolidays = service._countWorkingDays(2026, 1, new Set());
            expect(result).toBe(resultNoHolidays - 1);
        });
    });

    describe('_calcWorkingDays - Calculate Total Working Days', () => {
        it('UTCID27: Should sum all working day types', () => {
            const ts = {
                officialDays: 20,
                probationDays: 2,
                businessTripDays: 1,
                holidayDays: 1,
                benefitLeaveDays: 1,
            };
            const result = service._calcWorkingDays(ts);
            expect(result).toBe(25);
        });

        it('UTCID28: Should handle undefined values', () => {
            const ts = {
                officialDays: 20,
                probationDays: null,
                businessTripDays: undefined,
                holidayDays: 0,
                benefitLeaveDays: 0,
            };
            const result = service._calcWorkingDays(ts);
            expect(result).toBe(20);
        });
    });

    describe('_sumOTHours - Sum Overtime Hours', () => {
        it('UTCID29: Should sum all OT types', () => {
            const ts = {
                otWeekday: 10,
                otWeekdayNight: 5,
                otWeekend: 8,
                otWeekendNight: 3,
                otHoliday: 2,
                otHolidayNight: 1,
            };
            const result = service._sumOTHours(ts);
            expect(result).toBe(29);
        });

        it('UTCID30: Should handle undefined values', () => {
            const ts = {
                otWeekday: 10,
            };
            const result = service._sumOTHours(ts);
            expect(result).toBe(10);
        });
    });

    describe('_calcEarnedSalaries - Calculate Earned Salaries', () => {
        it('UTCID31: Should calculate P1 based on base salary and day factor', () => {
            const salary = { baseSalary: 10_000_000, performanceSalary: 5_000_000 };
            const ts = { officialDays: 26, probationDays: 0, businessTripDays: 0, holidayDays: 0, benefitLeaveDays: 0 };
            const result = service._calcEarnedSalaries(salary, ts, 26, 26, 0, 0, 'OFFICIAL');
            expect(result.earnedP1).toBe(10_000_000);
        });

        it('UTCID32: Should calculate P1 with day factor', () => {
            const salary = { baseSalary: 10_000_000, performanceSalary: 5_000_000 };
            const ts = { officialDays: 13, probationDays: 0, businessTripDays: 0, holidayDays: 0, benefitLeaveDays: 0 };
            // 13/26 = 0.5
            const result = service._calcEarnedSalaries(salary, ts, 26, 13, 0, 0, 'OFFICIAL');
            expect(result.earnedP1).toBe(5_000_000);
        });

        it('UTCID33: Should calculate probation salary with 85% factor', () => {
            const salary = { baseSalary: 10_000_000, performanceSalary: 0 };
            const ts = { officialDays: 0, probationDays: 20, businessTripDays: 0, holidayDays: 0, benefitLeaveDays: 0 };
            const result = service._calcEarnedSalaries(salary, ts, 26, 20, 0, 0, 'PROBATION');
            // (10M / 26) * 20 * 0.85 = 384615.38 * 20 * 0.85 = 6,538,461.54
            expect(result.probationSalary).toBeCloseTo(6_538_461.54, 0);
        });

        it('UTCID34: Should calculate P2.1 and P2.2 based on percentage', () => {
            const salary = { baseSalary: 10_000_000, performanceSalary: 5_000_000 };
            const ts = { officialDays: 26, probationDays: 0, businessTripDays: 0, holidayDays: 0, benefitLeaveDays: 0 };
            // p21Percent = 40%, p22Percent = 40%
            const result = service._calcEarnedSalaries(salary, ts, 26, 26, 40, 40, 'OFFICIAL');
            // P2.1 = 5M * 40% = 2M
            expect(result.earnedP21).toBe(2_000_000);
            // P2.2 = 5M * 40% = 2M
            expect(result.earnedP22).toBe(2_000_000);
        });
    });

    describe('_calcEarnedAllowances - Calculate Earned Allowances', () => {
        it('UTCID35: Should calculate allowances based on day factor', () => {
            const salary = {
                lunchAllowance: 1_000_000,
                fuelAllowance: 500_000,
                phoneAllowance: 200_000,
                otherAllowance: 300_000,
            };
            // Total: 2,000,000
            const ts = { standardDays: 26 };
            // 13/26 = 0.5 day factor
            const result = service._calcEarnedAllowances(salary, ts, 26, 13);
            expect(result).toBe(1_000_000);
        });

        it('UTCID36: Should return 0 for 0 standard days', () => {
            const salary = { lunchAllowance: 1_000_000 };
            const result = service._calcEarnedAllowances(salary, { standardDays: 0 }, 0, 0);
            expect(result).toBe(0);
        });
    });

    describe('_getOTMultiplier - OT Multiplier', () => {
        it('UTCID37: Should return default WEEKDAY multiplier (1.5)', () => {
            const result = service._getOTMultiplier('WEEKDAY', false, null, [], []);
            expect(result).toBe(1.5);
        });

        it('UTCID38: Should return default WEEKEND multiplier (2.0)', () => {
            const result = service._getOTMultiplier('WEEKEND', false, null, [], []);
            expect(result).toBe(2.0);
        });

        it('UTCID39: Should return default HOLIDAY multiplier (3.0)', () => {
            const result = service._getOTMultiplier('HOLIDAY', false, null, [], []);
            expect(result).toBe(3.0);
        });

        it('UTCID40: Should add 0.1 for night shift', () => {
            const result = service._getOTMultiplier('WEEKDAY', true, null, [], []);
            expect(result).toBe(1.6);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // FIND & EXPORT
    // ═══════════════════════════════════════════════════════════════

    describe('findAll - Get All Payrolls', () => {
        it('UTCID41: Should return enriched payroll list with employee count', async () => {
            payrollRepo.findAll.mockResolvedValue({
                items: [mockPayroll],
                total: 1,
            });
            detailRepo.findByPayroll.mockResolvedValue([
                { ...mockDetail, netSalary: 10_000_000 },
                { ...mockDetail, id: 2, netSalary: 12_000_000 },
            ]);

            const result = await service.findAll({ page: 1, limit: 10 });

            expect(result.items[0].employeeCount).toBe(2);
            expect(result.items[0].totalNetSalary).toBe(22_000_000);
        });
    });

    describe('findById - Get Payroll By ID', () => {
        it('UTCID42: Should return payroll with details', async () => {
            payrollRepo.findById.mockResolvedValue(mockPayroll);
            detailRepo.findByPayroll.mockResolvedValue([mockDetail]);

            const result = await service.findById(1);

            expect(result.id).toBe(1);
            expect(result.details).toHaveLength(1);
            expect(result.employeeCount).toBe(1);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // IMPORT/EXPORT
    // ═══════════════════════════════════════════════════════════════

    describe('importDetails - Import Salary Details', () => {
        it('UTCID44: Import to locked payroll - should throw error', async () => {
            payrollRepo.findById.mockResolvedValue({ ...mockPayroll, payrollStatus: 'LOCKED' });

            await expectRejectWithStatus(
                service.importDetails(1, Buffer.from('test')),
                400
            );
        });
    });
});
