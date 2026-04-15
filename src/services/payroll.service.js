import { AppMessages } from '../common/constants/index.js';
import { NotFoundException, ConflictException, BadRequestException } from '../common/exceptions/index.js';
import { AppDataSource } from '../database/data-source.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { EmployeeSalaryEntity } from '../models/entities/employee-salary.entity.js';
import { TimeSheetEntity } from '../models/entities/time-sheet.entity.js';
import { OvertimeRuleEntity } from '../models/entities/overtime-rule.entity.js';
import { ExcelUtil } from '../common/utils/excel.util.js';
import sendMail from '../common/utils/mail.util.js';

import { ProcessedAttendanceRecordEntity } from '../models/entities/processed-attendance-record.entity.js';
import { HolidayListEntity } from '../models/entities/holiday-list.entity.js';
import { OvertimeRequestDetailEntity } from '../models/entities/overtime-request-detail.entity.js';
import { OvertimeRuleDepartmentEntity } from '../models/entities/overtime-rule-department.entity.js';
import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

const PAYROLL_STATUS = {
    DRAFT: 'DRAFT',
    PENDING_APPROVAL: 'PENDING_APPROVAL',
    APPROVED: 'APPROVED',
    LOCKED: 'LOCKED',
};

// Insurance rates (standard Vietnam)
const SOCIAL_INSURANCE_RATE = 0.08;  // 8%
const HEALTH_INSURANCE_RATE = 0.015; // 1.5%
const UNEMPLOYMENT_RATE = 0.01;      // 1%

// PIT thresholds (VND)
const PIT_PERSONAL_DEDUCTION = 11_000_000;

export class PayrollService {
    constructor(payrollRepository, payrollDetailRepository) {
        this.payrollRepository = payrollRepository;
        this.payrollDetailRepository = payrollDetailRepository;
    }

    // ──────────────────────────────────────
    // UC27 - Payroll Creation & Calculation
    // ──────────────────────────────────────

    async create(dto) {
        const { payrollMonth, payrollYear, employeeIds = [] } = dto;

        const existing = await this.payrollRepository.findByPeriod(payrollMonth, payrollYear);
        if (existing) {
            throw new ConflictException(AppMessages.Errors.Payroll.ALREADY_EXISTS);
        }

        const payroll = await this.payrollRepository.create({
            payrollMonth,
            payrollYear,
            payrollStatus: PAYROLL_STATUS.DRAFT,
        });

        // Pre-create details for selected employees
        if (employeeIds && employeeIds.length > 0) {
            const detailData = employeeIds.map(id => ({
                payrollId: payroll.id,
                employeeId: id,
                netSalary: 0, // Placeholder
            }));
            await this.payrollDetailRepository.bulkCreate(detailData);
        }

        return payroll;
    }

    async autoCalculate(payrollId) {
        const payroll = await this._findPayrollOrFail(payrollId);

        if (payroll.payrollStatus === PAYROLL_STATUS.LOCKED) {
            throw new BadRequestException(AppMessages.Errors.Payroll.IS_LOCKED);
        }

        const { payrollMonth, payrollYear } = payroll;
        const startDate = new Date(payrollYear, payrollMonth - 1, 1);
        const endDate = new Date(payrollYear, payrollMonth, 0, 23, 59, 59);

        // 1. Get employees assigned to this payroll
        const existingDetails = await this.payrollDetailRepository.findByPayroll(payrollId);
        const employees = existingDetails.map(d => d.employee).filter(Boolean);
        if (employees.length === 0) return { calculated: 0, details: [] };

        const empIds = employees.map(e => e.id);

        // 2. Calculate Standard Days for the month (Dynamic)
        const holidayRepo = AppDataSource.getRepository(HolidayListEntity);
        const holidays = await holidayRepo.find({
            where: [
                { startDate: Between(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]), isDeleted: false },
                { endDate: Between(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]), isDeleted: false },
                { startDate: LessThanOrEqual(startDate.toISOString().split('T')[0]), endDate: MoreThanOrEqual(endDate.toISOString().split('T')[0]), isDeleted: false },
            ],
        });
        const holidayDates = new Set();
        holidays.forEach(h => {
            const current = new Date(h.startDate);
            const stop = new Date(h.endDate || h.startDate);
            while (current <= stop) { holidayDates.add(current.toISOString().split('T')[0]); current.setDate(current.getDate() + 1); }
        });
        const standardDays = this._countWorkingDays(payrollYear, payrollMonth, holidayDates);

        // 3. Get summarized TimeSheets
        const timesheetRepo = AppDataSource.getRepository(TimeSheetEntity);
        const timesheets = await timesheetRepo.find({
            where: {
                month: payrollMonth,
                year: payrollYear,
                employeeId: In(empIds),
                isDeleted: false
            }
        });

        // 3b. Fetch all potentially active OT Rules for resolving multipliers dynamically
        const ruleRepo = AppDataSource.getRepository(OvertimeRuleEntity);
        const activeRules = await ruleRepo.find({
            where: { versionStatus: 'ACTIVE', status: 'ACTIVE', isDeleted: false },
            relations: ['overtimeType'],
        });
        
        const ruleDeptRepo = AppDataSource.getRepository(OvertimeRuleDepartmentEntity);
        const ruleDepts = await ruleDeptRepo.find({
            where: { isDeleted: false },
        });

        // 4. Calculate each detail
        const details = [];
        for (const employee of employees) {
            const salaryRepo = AppDataSource.getRepository(EmployeeSalaryEntity);
            const empSalaries = await salaryRepo.find({
                where: { employeeId: employee.id, isDeleted: false },
                order: { createdAt: 'DESC' },
            });
            const preferred = ['ACTIVE', 'APPROVED', 'ACTIVE_MEMBER'];
            const salary = empSalaries.find(s => preferred.includes(String(s.salaryStatus || '').trim().toUpperCase())) || empSalaries[0];
            if (!salary) continue;

            // 5. Use prioritized data from TimeSheetEntity
            const ts = timesheets.find(t => t.employeeId === employee.id);
            if (!ts) {
                // If the user wants to ONLY calculate for those with timesheets, 
                // we skip employees who aren't found in the summarized timesheet table.
                continue;
            }
            
            // Granular fields (fallback to 0 if no timesheet generated)
            const officialDays = Number(ts?.officialDays || 0);
            const probationDays = Number(ts?.probationDays || 0);
            const businessTripDays = Number(ts?.businessTripDays || 0);
            const holidayDays = Number(ts?.holidayDays || 0);
            const benefitLeaveDays = Number(ts?.benefitLeaveDays || 0);
            const nightShiftOfficialDays = Number(ts?.nightShiftOfficialDays || 0);
            const nightShiftProbationDays = Number(ts?.nightShiftProbationDays || 0);
            
            // OT breakdown from Timesheet
            const otWeekday = Number(ts?.otWeekday || 0);
            const otWeekdayNight = Number(ts?.otWeekdayNight || 0);
            const otWeekend = Number(ts?.otWeekend || 0);
            const otWeekendNight = Number(ts?.otWeekendNight || 0);
            const otHoliday = Number(ts?.otHoliday || 0);
            const otHolidayNight = Number(ts?.otHolidayNight || 0);
            const totalOtHours = Number(ts?.overtimeHours || (otWeekday + otWeekdayNight + otWeekend + otWeekendNight + otHoliday + otHolidayNight));

            // 6. Calculate Overtime Pay
            // We still need individual request details if we want completely accurate multiplier resolution, 
            // but the User wants payroll from "timesheet data table". 
            // If the table shows breakdown, we should use standard multipliers for these breakdowns.
            const hourlyRate = (parseFloat(salary.baseSalary) || 0) / (standardDays || (ts?.standardDays > 0 ? ts.standardDays : 26)) / 8;
            
            // Standard multipliers if specific rule not found
            let overtimePay = 0;
            
            // Helper to get multiplier for a type
            const getMultiplier = (typeCode, isNight) => {
                const rule = activeRules.find(r => r.overtimeType?.code === typeCode && 
                             (ruleDepts.filter(rd => rd.overtimeRuleId === r.id).length === 0 || 
                              ruleDepts.some(rd => rd.overtimeRuleId === r.id && rd.departmentId === employee.departmentId)));
                let m = rule ? parseFloat(rule.salaryMultiplier || 1.5) : (typeCode === 'WEEKDAY' ? 1.5 : (typeCode === 'WEEKEND' ? 2.0 : 3.0));
                if (isNight) m += 0.1; // Example: night shift bonus 10% (adjust per business rule)
                return m;
            };

            overtimePay += otWeekday * hourlyRate * getMultiplier('WEEKDAY', false);
            overtimePay += otWeekdayNight * hourlyRate * getMultiplier('WEEKDAY', true);
            overtimePay += otWeekend * hourlyRate * getMultiplier('WEEKEND', false);
            overtimePay += otWeekendNight * hourlyRate * getMultiplier('WEEKEND', true);
            overtimePay += otHoliday * hourlyRate * getMultiplier('HOLIDAY', false);
            overtimePay += otHolidayNight * hourlyRate * getMultiplier('HOLIDAY', true);

            const workingDays = officialDays + probationDays + businessTripDays + holidayDays + benefitLeaveDays;
            
            // 7. Salary calculation bases
            const p1Amount = parseFloat(salary.baseSalary) || 0;
            const p21Amount = (parseFloat(salary.performanceSalary) || 0) * 0.8;
            const p22Amount = (parseFloat(salary.performanceSalary) || 0) * 0.2;
            const p1p2Percentage = 100; // Default
            const p3Percentage = 100; // Default

            const isProbation = employee.employmentStatus === 'PROBATION';
            const fullPayDays = (isProbation ? 0 : businessTripDays) + officialDays + holidayDays + benefitLeaveDays;
            const probationPayDays = (isProbation ? businessTripDays : 0) + probationDays;

            const earnedP1 = (p1Amount / (standardDays || 26)) * fullPayDays;
            const earnedP21 = (p21Amount / (standardDays || 26)) * fullPayDays;
            const earnedP22 = (p22Amount / (standardDays || 26)) * fullPayDays;
            const probationSalary = (p1Amount / (standardDays || 26)) * probationPayDays * 0.85; // 85% for probation base

            const totalOfficialSalary = earnedP1 + earnedP21 + earnedP22 + probationSalary;
            
            const totalAllowances = (parseFloat(salary.lunchAllowance || 0) + parseFloat(salary.fuelAllowance || 0) + parseFloat(salary.phoneAllowance || 0) + parseFloat(salary.otherAllowance || 0));
            const earnedAllowances = (totalAllowances / (standardDays || 26)) * workingDays;
            const insuranceBase = Math.min(parseFloat(salary.baseSalary) || 0, 20 * 2_340_000);
            
            const socialInsurance = parseFloat((insuranceBase * SOCIAL_INSURANCE_RATE).toFixed(2));
            const healthInsurance = parseFloat((insuranceBase * HEALTH_INSURANCE_RATE).toFixed(2));
            const unemploymentInsurance = parseFloat((insuranceBase * UNEMPLOYMENT_RATE).toFixed(2));
            const insuranceDeduction = socialInsurance + healthInsurance + unemploymentInsurance;

            const taxableIncome = totalOfficialSalary + earnedAllowances + overtimePay - insuranceDeduction - PIT_PERSONAL_DEDUCTION;
            const taxDeduction = taxableIncome > 0 ? parseFloat(this._calcPIT(taxableIncome).toFixed(2)) : 0;

            const existingDetail = await this.payrollDetailRepository.findByPayrollAndEmployee(payrollId, employee.id);
            const bonus = parseFloat(existingDetail?.bonus || 0);
            const penalty = parseFloat(existingDetail?.penalty || 0);
            const deduction = parseFloat(existingDetail?.deduction || 0);

            // NET SALARY AGREEMENT: Deductions (Insurance/Tax) are NOT subtracted from netSalary
            // They are borne by the company.
            const netSalary = parseFloat((totalOfficialSalary + earnedAllowances + overtimePay + bonus - penalty - deduction).toFixed(2));

            // Company Costs
            const companySocialInsurance = parseFloat((insuranceBase * 0.175).toFixed(2));
            const companyHealthInsurance = parseFloat((insuranceBase * 0.03).toFixed(2));
            const companyUnemploymentInsurance = parseFloat((insuranceBase * 0.01).toFixed(2));
            const companyUnionFee = parseFloat((insuranceBase * 0.02).toFixed(2));
            const totalHrCost = netSalary + insuranceDeduction + taxDeduction + companySocialInsurance + companyHealthInsurance + companyUnemploymentInsurance + companyUnionFee;

            const detailData = {
                payrollId, employeeId: employee.id,
                workingDays, baseSalary: p1Amount, overtimePay: parseFloat(overtimePay.toFixed(2)),
                bonus, penalty, deduction, insuranceDeduction, taxDeduction, netSalary,
                allowanceAmount: parseFloat(earnedAllowances.toFixed(2)),
                standardDays, officialDays, probationDays, businessTripDays, holidayDays,
                benefitLeaveDays: benefitLeaveDays,
                waitingDays: Number(ts?.waitingDays || 0),
                nightShiftOfficialDays,
                nightShiftProbationDays,
                otWeekday, otWeekdayNight, otWeekend, otWeekendNight, otHoliday, otHolidayNight,
                totalOtHours: otWeekday + otWeekdayNight + otWeekend + otWeekendNight + otHoliday + otHolidayNight,
                mealCount: Number(ts?.mealCount || 0),
                // New Fields
                p1Amount, p21Amount, p22Amount, p1p2Percentage, p3Percentage,
                probationAmount: probationSalary,
                socialInsurance, healthInsurance, unemploymentInsurance,
                taxableIncomePaid: taxableIncome > 0 ? taxableIncome : 0,
                companySocialInsurance,
                companyHealthInsurance,
                companyUnemploymentInsurance,
                companyUnionFee,
                totalHrCost: parseFloat(totalHrCost.toFixed(2))
            };

            details.push(existingDetail ? await this.payrollDetailRepository.update(existingDetail.id, detailData) : await this.payrollDetailRepository.create(detailData));
        }
        return { calculated: details.length, details };
    }

    _countWorkingDays(year, month, holidayDates) {
        const daysInMonth = new Date(year, month, 0).getDate();
        let count = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const dayOfWeek = date.getDay();
            const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateKey)) count++;
        }
        return count;
    }

    async updateDetail(detailId, dto) {
        const detail = await this.payrollDetailRepository.findById(detailId);
        if (!detail) throw new NotFoundException(AppMessages.Errors.Payroll.DETAIL_NOT_FOUND);

        const payroll = await this._findPayrollOrFail(detail.payrollId);
        if (payroll.payrollStatus === PAYROLL_STATUS.LOCKED) {
            throw new BadRequestException(AppMessages.Errors.Payroll.IS_LOCKED);
        }

        const bonus = dto.bonus !== undefined ? parseFloat(dto.bonus) : parseFloat(detail.bonus);
        const deduction = dto.deduction !== undefined ? parseFloat(dto.deduction) : parseFloat(detail.deduction);
        const penalty = dto.penalty !== undefined ? parseFloat(dto.penalty) : parseFloat(detail.penalty);

        // Standard attendance fields
        const standardDays = dto.standardDays !== undefined ? parseFloat(dto.standardDays) : parseFloat(detail.standardDays || 26);
        const workingDays = dto.workingDays !== undefined ? parseFloat(dto.workingDays) : parseFloat(detail.workingDays || 0);
        const officialDays = dto.officialDays !== undefined ? parseFloat(dto.officialDays) : parseFloat(detail.officialDays || 0);
        const probationDays = dto.probationDays !== undefined ? parseFloat(dto.probationDays) : parseFloat(detail.probationDays || 0);
        const businessTripDays = dto.businessTripDays !== undefined ? parseFloat(dto.businessTripDays) : parseFloat(detail.businessTripDays || 0);
        const holidayDays = dto.holidayDays !== undefined ? parseFloat(dto.holidayDays) : parseFloat(detail.holidayDays || 0);
        const benefitLeaveDays = dto.benefitLeaveDays !== undefined ? parseFloat(dto.benefitLeaveDays) : parseFloat(detail.benefitLeaveDays || 0);

        // Recalculate salary if attendance changed or other factors changed
        // This is a simplified version of autoCalculate logic
        const p1Amount = parseFloat(detail.baseSalary) || 0;
        const hourlyRate = p1Amount / (standardDays || 26) / 8;
        
        // Use auto-calculate logic for netSalary if needed, otherwise use simple sum
        // For individual updates, we'll keep it simple or allow a full recalculation call
        const netSalary = parseFloat((
            parseFloat(detail.p1Amount || 0) +
            parseFloat(detail.overtimePay || 0) +
            parseFloat(detail.p21Amount || 0) +
            parseFloat(detail.p22Amount || 0) +
            parseFloat(detail.probationAmount || 0) +
            parseFloat(detail.allowanceAmount || 0) +
            bonus -
            deduction -
            penalty
        ).toFixed(2));

        return this.payrollDetailRepository.update(detailId, {
            bonus,
            deduction,
            penalty,
            standardDays,
            workingDays,
            officialDays,
            probationDays,
            businessTripDays,
            holidayDays,
            benefitLeaveDays,
            netSalary,
            note: dto.note !== undefined ? dto.note : detail.note,
        });
    }

    async importDetails(payrollId, fileBuffer) {
        const payroll = await this._findPayrollOrFail(payrollId);
        if (payroll.payrollStatus === PAYROLL_STATUS.LOCKED) {
            throw new BadRequestException(AppMessages.Errors.Payroll.IS_LOCKED);
        }

        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.default.Workbook();
        
        try {
            await workbook.xlsx.load(fileBuffer);
        } catch (err) {
            if (err.message.includes('Worksheet name')) {
                throw new BadRequestException('Tên sheet trong file Excel chứa ký tự không hợp lệ (* ? : \\ / [ ]). Vui lòng đổi tên sheet (VD: "Sheet1") và thử lại.');
            }
            throw err;
        }

        const worksheet = workbook.getWorksheet(1); // Standard: first sheet

        const importedData = [];
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            const employeeCode = row.getCell(2).value?.toString() || row.getCell(2).text;
            if (!employeeCode) return;

            importedData.push({
                employeeCode,
                standardDays: parseFloat(row.getCell(6).value || 0),
                workingDays: parseFloat(row.getCell(7).value || 0),
                officialDays: parseFloat(row.getCell(8).value || 0),
                probationDays: parseFloat(row.getCell(9).value || 0),
                businessTripDays: parseFloat(row.getCell(10).value || 0),
                holidayDays: parseFloat(row.getCell(11).value || 0),
                benefitLeaveDays: parseFloat(row.getCell(12).value || 0),
                annualLeaveDays: parseFloat(row.getCell(13).value || 0),
                unpaidLeaveDays: parseFloat(row.getCell(14).value || 0),
                nightShiftOfficialDays: parseFloat(row.getCell(15).value || 0),
                nightShiftProbationDays: parseFloat(row.getCell(16).value || 0),
                waitingDays: parseFloat(row.getCell(17).value || 0),
                mealCount: parseFloat(row.getCell(18).value || 0),
                usedLeaveDays: parseFloat(row.getCell(19).value || 0),
                remainingLeaveDays: parseFloat(row.getCell(20).value || 0),
                bonus: parseFloat(row.getCell(21).value || 0),
                deduction: parseFloat(row.getCell(22).value || 0),
                penalty: parseFloat(row.getCell(23).value || 0),
            });
        });

        const results = [];
        for (const data of importedData) {
            const detail = await this.payrollDetailRepository.findByPayrollAndEmployeeCode(payrollId, data.employeeCode);
            if (!detail) continue;

            const netSalary = parseFloat((
                parseFloat(detail.baseSalary) +
                parseFloat(detail.overtimePay) +
                data.bonus -
                data.deduction -
                data.penalty -
                parseFloat(detail.insuranceDeduction) -
                parseFloat(detail.taxDeduction)
            ).toFixed(2));

            const updated = await this.payrollDetailRepository.update(detail.id, {
                ...data,
                employeeCode: undefined, // Don't update this
                netSalary,
            });
            results.push(updated);
        }

        return { importedCount: results.length };
    }

    // ──────────────────────────────────────
    // UC28 - Payroll Data Management
    // ──────────────────────────────────────

    async findAll(queryDto) {
        const result = await this.payrollRepository.findAll({
            month: queryDto.month,
            year: queryDto.year,
            status: queryDto.status,
            search: queryDto.search,
            skip: queryDto.skip,
            take: queryDto.take,
        });

        // Enrich with detail counts
        const enriched = await Promise.all(result.items.map(async (p) => {
            const details = await this.payrollDetailRepository.findByPayroll(p.id);
            const totalNetSalary = details.reduce((sum, d) => sum + parseFloat(d.netSalary || 0), 0);
            return {
                ...p,
                employeeCount: details.length,
                totalNetSalary: parseFloat(totalNetSalary.toFixed(2)),
            };
        }));

        return {
            items: enriched,
            total: result.total,
            page: queryDto.page,
            limit: queryDto.limit,
            totalPages: Math.ceil(result.total / queryDto.limit),
        };
    }

    async findById(id) {
        const payroll = await this._findPayrollOrFail(id);
        const details = await this.payrollDetailRepository.findByPayroll(id);
        const totalNetSalary = details.reduce((sum, d) => sum + parseFloat(d.netSalary || 0), 0);

        return {
            ...payroll,
            details,
            employeeCount: details.length,
            totalNetSalary: parseFloat(totalNetSalary.toFixed(2)),
        };
    }

    async update(id, data) {
        const payroll = await this._findPayrollOrFail(id);
        if (payroll.payrollStatus === PAYROLL_STATUS.LOCKED) {
            throw new BadRequestException(AppMessages.Errors.Payroll.IS_LOCKED);
        }
        return this.payrollRepository.update(id, data);
    }

    async getDetailsByDepartment(payrollId, departmentId) {
        await this._findPayrollOrFail(payrollId);
        return this.payrollDetailRepository.findByPayrollAndDepartment(payrollId, departmentId);
    }

    async exportSummary(payrollId) {
        const payroll = await this._findPayrollOrFail(payrollId);
        const details = await this.payrollDetailRepository.findByPayroll(payrollId);

        const data = details.map((d, index) => ({
            index: index + 1,
            employeeCode: d.employee?.employeeCode || '',
            fullName: d.employee?.fullName || '',
            department: d.employee?.department?.departmentName || '',
            position: d.employee?.position?.positionName || '',
            standardDays: d.standardDays || 26,
            workingDays: d.workingDays || 0,
            officialDays: d.officialDays || 0,
            probationDays: d.probationDays || 0,
            businessTripDays: d.businessTripDays || 0,
            holidayDays: d.holidayDays || 0,
            benefitLeaveDays: d.benefitLeaveDays || 0,
            annualLeaveDays: d.annualLeaveDays || 0,
            unpaidLeaveDays: d.unpaidLeaveDays || 0,
            nightShiftOfficialDays: d.nightShiftOfficialDays || 0,
            nightShiftProbationDays: d.nightShiftProbationDays || 0,
            waitingDays: d.waitingDays || 0,
            mealCount: d.mealCount || 0,
            usedLeaveDays: d.usedLeaveDays || 0,
            remainingLeaveDays: d.remainingLeaveDays || 0,
            bonus: parseFloat(d.bonus || 0),
            deduction: parseFloat(d.deduction || 0),
            penalty: parseFloat(d.penalty || 0),
            netSalary: parseFloat(d.netSalary || 0),
        }));

        const columns = [
            { header: 'STT', key: 'index', width: 6 },
            { header: 'Mã NV', key: 'employeeCode', width: 12 },
            { header: 'Họ và tên', key: 'fullName', width: 25 },
            { header: 'Phòng ban', key: 'department', width: 20 },
            { header: 'Chức vụ', key: 'position', width: 18 },
            { header: 'Số lương chuẩn', key: 'standardDays', width: 10 },
            { header: 'Ngày công', key: 'workingDays', width: 10 },
            { header: 'Công CT', key: 'officialDays', width: 10 },
            { header: 'Công TV', key: 'probationDays', width: 10 },
            { header: 'Công tác/Học', key: 'businessTripDays', width: 10 },
            { header: 'Lễ', key: 'holidayDays', width: 10 },
            { header: 'Chế độ', key: 'benefitLeaveDays', width: 10 },
            { header: 'Phép', key: 'annualLeaveDays', width: 10 },
            { header: 'KL/BHXH', key: 'unpaidLeaveDays', width: 10 },
            { header: 'Đêm CT', key: 'nightShiftOfficialDays', width: 10 },
            { header: 'Đêm TV', key: 'nightShiftProbationDays', width: 10 },
            { header: 'Chờ việc', key: 'waitingDays', width: 10 },
            { header: 'Cơm', key: 'mealCount', width: 10 },
            { header: 'Phép dùng', key: 'usedLeaveDays', width: 10 },
            { header: 'Phép tồn', key: 'remainingLeaveDays', width: 10 },
            { header: 'Thưởng', key: 'bonus', width: 14 },
            { header: 'Khấu trừ', key: 'deduction', width: 14 },
            { header: 'Phạt', key: 'penalty', width: 12 },
            { header: 'Thực nhận', key: 'netSalary', width: 16 },
        ];

        return ExcelUtil.export(
            data, columns,
            `Bang luong T${payroll.payrollMonth}-${payroll.payrollYear}`
        );
    }

    // ──────────────────────────────────────
    // UC29 - Payroll Submission & Approval
    // ──────────────────────────────────────

    async submitForApproval(payrollId) {
        const payroll = await this._findPayrollOrFail(payrollId);
        if (payroll.payrollStatus !== PAYROLL_STATUS.DRAFT) {
            throw new BadRequestException(AppMessages.Errors.Payroll.INVALID_STATUS_TRANSITION);
        }
        return this.payrollRepository.update(payrollId, {
            payrollStatus: PAYROLL_STATUS.PENDING_APPROVAL,
            rejectedReason: null,
        });
    }

    async approve(payrollId, userId) {
        const payroll = await this._findPayrollOrFail(payrollId);
        if (payroll.payrollStatus !== PAYROLL_STATUS.PENDING_APPROVAL) {
            throw new BadRequestException(AppMessages.Errors.Payroll.INVALID_STATUS_TRANSITION);
        }

        // Resolve approvedBy employee id
        const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
        const employee = await employeeRepo.findOne({ where: { userId, isDeleted: false } });

        return this.payrollRepository.update(payrollId, {
            payrollStatus: PAYROLL_STATUS.APPROVED,
            approvedBy: employee?.id || null,
            approvedAt: new Date(),
        });
    }

    async reject(payrollId, userId, reason) {
        const payroll = await this._findPayrollOrFail(payrollId);
        if (payroll.payrollStatus !== PAYROLL_STATUS.PENDING_APPROVAL) {
            throw new BadRequestException(AppMessages.Errors.Payroll.INVALID_STATUS_TRANSITION);
        }

        return this.payrollRepository.update(payrollId, {
            payrollStatus: PAYROLL_STATUS.DRAFT,
            rejectedReason: reason,
        });
    }

    // ──────────────────────────────────────
    // UC30 - Payroll Locking & Payslip Distribution
    // ──────────────────────────────────────

    async lock(payrollId) {
        const payroll = await this._findPayrollOrFail(payrollId);
        if (payroll.payrollStatus !== PAYROLL_STATUS.APPROVED) {
            throw new BadRequestException(AppMessages.Errors.Payroll.INVALID_STATUS_TRANSITION);
        }
        return this.payrollRepository.update(payrollId, { payrollStatus: PAYROLL_STATUS.LOCKED });
    }

    async unlock(payrollId) {
        const payroll = await this._findPayrollOrFail(payrollId);
        if (payroll.payrollStatus !== PAYROLL_STATUS.LOCKED) {
            throw new BadRequestException(AppMessages.Errors.Payroll.NOT_LOCKED);
        }
        return this.payrollRepository.update(payrollId, { payrollStatus: PAYROLL_STATUS.APPROVED });
    }

    async sendPayslips(payrollId) {
        const payroll = await this._findPayrollOrFail(payrollId);
        if (payroll.payrollStatus !== PAYROLL_STATUS.LOCKED) {
            throw new BadRequestException(AppMessages.Errors.Payroll.NOT_LOCKED);
        }

        const details = await this.payrollDetailRepository.findByPayroll(payrollId);
        let sentCount = 0;

        for (const detail of details) {
            const email = detail.employee?.companyEmail || detail.employee?.user?.email;
            if (!email) continue;

            const html = this._buildPayslipHtml(detail, payroll);
            try {
                await sendMail(
                    email,
                    `Phiếu lương Tháng ${payroll.payrollMonth}/${payroll.payrollYear} - SmartHR`,
                    '',
                    html
                );
                sentCount++;
            } catch (err) {
                console.error(`[PayrollService] Failed to send payslip to ${email}:`, err.message);
            }
        }

        // Mark all details as sent
        await this.payrollDetailRepository.bulkUpdateSentAt(payrollId, new Date());

        return { sent: sentCount, total: details.length };
    }

    async exportPayslips(payrollId) {
        const payroll = await this._findPayrollOrFail(payrollId);
        const details = await this.payrollDetailRepository.findByPayroll(payrollId);

        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.default.Workbook();

        for (const detail of details) {
            const emp = detail.employee;
            const sheetName = (emp?.employeeCode || emp?.fullName || `NV${detail.employeeId}`)
                .replace(/[*?:\\/\[\]]/g, '')
                .substring(0, 31);

            const ws = workbook.addWorksheet(sheetName);

            // Title
            ws.mergeCells('A1:D1');
            const titleCell = ws.getCell('A1');
            titleCell.value = `PHIẾU LƯƠNG - Tháng ${payroll.payrollMonth}/${payroll.payrollYear}`;
            titleCell.font = { bold: true, size: 14 };
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            ws.getRow(1).height = 30;

            // Employee info
            ws.mergeCells('A2:D2');
            const empCell = ws.getCell('A2');
            empCell.value = `Nhân viên: ${emp?.fullName || ''} (${emp?.employeeCode || ''}) | Phòng ban: ${emp?.department?.departmentName || ''}`;
            empCell.font = { italic: true, size: 11 };
            empCell.alignment = { horizontal: 'center' };

            // Salary breakdown rows
            const rows = [
                ['Chỉ tiêu', 'Số tiền (VND)'],
                ['Ngày công thực tế', detail.workingDays || 0],
                ['Lương cơ bản (P1)', parseFloat(detail.baseSalary || 0)],
                ['Lương hiệu năng (P2)', parseFloat(Number(detail.p21Amount || 0) + Number(detail.p22Amount || 0))],
                ['Lương thử việc', parseFloat(detail.probationAmount || 0)],
                ['Phụ cấp', parseFloat(detail.allowanceAmount || 0)],
                ['Phụ cấp làm thêm giờ', parseFloat(detail.overtimePay || 0)],
                ['Thưởng', parseFloat(detail.bonus || 0)],
                ['Khấu trừ', -parseFloat(detail.deduction || 0)],
                ['Phạt', -parseFloat(detail.penalty || 0)],
                ['Bảo hiểm (BHXH/YT/TN)', -parseFloat(detail.insuranceDeduction || 0)],
                ['Thuế TNCN', -parseFloat(detail.taxDeduction || 0)],
                ['THỰC NHẬN', parseFloat(detail.netSalary || 0)],
            ];

            rows.forEach((row, idx) => {
                const wsRow = ws.getRow(4 + idx);
                wsRow.getCell(1).value = row[0];
                wsRow.getCell(4).value = row[1];
                wsRow.getCell(1).font = { bold: idx === 0 || idx === rows.length - 1 };
                wsRow.getCell(4).font = { bold: idx === 0 || idx === rows.length - 1 };
                if (idx === rows.length - 1) {
                    wsRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
                    wsRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
                }
                [1, 4].forEach(col => {
                    wsRow.getCell(col).border = {
                        top: { style: 'thin' }, left: { style: 'thin' },
                        bottom: { style: 'thin' }, right: { style: 'thin' }
                    };
                });
            });

            ws.columns = [
                { width: 30 }, { width: 5 }, { width: 5 }, { width: 20 }
            ];

            if (detail.note) {
                const noteRow = ws.getRow(4 + rows.length + 1);
                noteRow.getCell(1).value = `Ghi chú: ${detail.note}`;
                noteRow.getCell(1).font = { italic: true, color: { argb: 'FF6B7280' } };
                ws.mergeCells(`A${4 + rows.length + 1}:D${4 + rows.length + 1}`);
            }
        }

        return await workbook.xlsx.writeBuffer();
    }

    // ──────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────

    async _findPayrollOrFail(id) {
        const payroll = await this.payrollRepository.findById(id);
        if (!payroll) throw new NotFoundException(AppMessages.Errors.Payroll.NOT_FOUND);
        return payroll;
    }

    _calcPIT(taxableIncome) {
        // Progressive PIT brackets (VND/month)
        const brackets = [
            { max: 5_000_000, rate: 0.05 },
            { max: 10_000_000, rate: 0.10 },
            { max: 18_000_000, rate: 0.15 },
            { max: 32_000_000, rate: 0.20 },
            { max: 52_000_000, rate: 0.25 },
            { max: 80_000_000, rate: 0.30 },
            { max: Infinity, rate: 0.35 },
        ];

        let tax = 0;
        let prev = 0;
        for (const bracket of brackets) {
            if (taxableIncome <= prev) break;
            const chunk = Math.min(taxableIncome, bracket.max) - prev;
            tax += chunk * bracket.rate;
            prev = bracket.max;
        }
        return tax;
    }

    _buildPayslipHtml(detail, payroll) {
        const emp = detail.employee;
        const fmt = (n) => new Intl.NumberFormat('vi-VN').format(parseFloat(n || 0));

        return `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #4f46e5; text-align: center; margin-bottom: 4px;">PHIẾU LƯƠNG</h2>
            <p style="text-align: center; color: #6b7280; margin-top: 0;">Tháng ${payroll.payrollMonth}/${payroll.payrollYear}</p>
            <hr style="border-color: #e5e7eb; margin: 16px 0;" />
            <p><strong>Họ và tên:</strong> ${emp?.fullName || ''}</p>
            <p><strong>Mã nhân viên:</strong> ${emp?.employeeCode || ''}</p>
            <p><strong>Phòng ban:</strong> ${emp?.department?.departmentName || ''}</p>
            <hr style="border-color: #e5e7eb; margin: 16px 0;" />
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f9fafb;"><th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">Chỉ tiêu</th><th style="text-align:right;padding:8px;border:1px solid #e5e7eb;">Số tiền</th></tr>
                <tr><td style="padding:8px;border:1px solid #e5e7eb;">Ngày công thực tế</td><td style="text-align:right;padding:8px;border:1px solid #e5e7eb;">${detail.workingDays} ngày</td></tr>
                <tr><td style="padding:8px;border:1px solid #e5e7eb;">Lương cơ bản (P1)</td><td style="text-align:right;padding:8px;border:1px solid #e5e7eb;">${fmt(detail.baseSalary)} ₫</td></tr>
                ${(Number(detail.p21Amount) + Number(detail.p22Amount)) > 0 ? `<tr><td style="padding:8px;border:1px solid #e5e7eb;">Lương hiệu năng (P2)</td><td style="text-align:right;padding:8px;border:1px solid #e5e7eb;">+${fmt(Number(detail.p21Amount) + Number(detail.p22Amount))} ₫</td></tr>` : ''}
                ${Number(detail.probationAmount) > 0 ? `<tr><td style="padding:8px;border:1px solid #e5e7eb;">Lương thử việc</td><td style="text-align:right;padding:8px;border:1px solid #e5e7eb;">+${fmt(detail.probationAmount)} ₫</td></tr>` : ''}
                ${Number(detail.allowanceAmount) > 0 ? `<tr><td style="padding:8px;border:1px solid #e5e7eb;">Phụ cấp</td><td style="text-align:right;padding:8px;border:1px solid #e5e7eb;">+${fmt(detail.allowanceAmount)} ₫</td></tr>` : ''}
                <tr><td style="padding:8px;border:1px solid #e5e7eb;">Phụ cấp làm thêm giờ</td><td style="text-align:right;padding:8px;border:1px solid #e5e7eb;">+${fmt(detail.overtimePay)} ₫</td></tr>
                <tr><td style="padding:8px;border:1px solid #e5e7eb;">Thưởng</td><td style="text-align:right;padding:8px;border:1px solid #e5e7eb;">+${fmt(detail.bonus)} ₫</td></tr>
                <tr style="color:#dc2626;"><td style="padding:8px;border:1px solid #e5e7eb;">Khấu trừ</td><td style="text-align:right;padding:8px;border:1px solid #e5e7eb;">-${fmt(detail.deduction)} ₫</td></tr>
                <tr style="color:#dc2626;"><td style="padding:8px;border:1px solid #e5e7eb;">Phạt</td><td style="text-align:right;padding:8px;border:1px solid #e5e7eb;">-${fmt(detail.penalty)} ₫</td></tr>
                <tr style="color:#dc2626;"><td style="padding:8px;border:1px solid #e5e7eb;">Bảo hiểm (BHXH/YT/TN)</td><td style="text-align:right;padding:8px;border:1px solid #e5e7eb;">-${fmt(detail.insuranceDeduction)} ₫</td></tr>
                <tr style="color:#dc2626;"><td style="padding:8px;border:1px solid #e5e7eb;">Thuế TNCN</td><td style="text-align:right;padding:8px;border:1px solid #e5e7eb;">-${fmt(detail.taxDeduction)} ₫</td></tr>
                <tr style="background:#ecfdf5; font-weight:bold;">
                    <td style="padding:10px;border:1px solid #d1fae5; color:#065f46;">THỰC NHẬN</td>
                    <td style="text-align:right;padding:10px;border:1px solid #d1fae5; color:#065f46;">${fmt(detail.netSalary)} ₫</td>
                </tr>
            </table>
            ${detail.note ? `<p style="margin-top:12px;color:#6b7280;font-style:italic;">Ghi chú: ${detail.note}</p>` : ''}
            <p style="margin-top:24px;font-size:12px;color:#9ca3af;text-align:center;">Email tự động từ hệ thống SmartHR. Vui lòng không phản hồi.</p>
        </div>`;
    }
}
