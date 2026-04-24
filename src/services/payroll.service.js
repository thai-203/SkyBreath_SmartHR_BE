/**
 * PayrollService - Service xử lý nghiệp vụ tính lương
 *
 * Cấu trúc lương:
 * - P1: Lương cơ bản (baseSalary)
 * - P2: Lương hiệu năng, gồm:
 *   - P2.1: Điểm tổng hợp (1.1-1.5) từ bảng performance_reviews
 *   - P2.2: Điểm kết quả (score_result) từ bảng performance_reviews
 * - P3: Thưởng/Phạt
 *
 * Tỷ lệ bảo hiểm cố định theo luật VN:
 * - BHXH: 8%
 * - BHYT: 1.5%
 * - BHTN: 1%
 * - KPCĐ: 0%
 */

import { AppMessages } from '../common/constants/index.js';
import { BadRequestException, ConflictException, NotFoundException } from '../common/exceptions/index.js';
import { ExcelUtil } from '../common/utils/excel.util.js';
import sendMail from '../common/utils/mail.util.js';
import { AppDataSource } from '../database/data-source.js';
import { EmployeeSalaryEntity } from '../models/entities/employee-salary.entity.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { OvertimeRuleEntity } from '../models/entities/overtime-rule.entity.js';
import { TimeSheetEntity } from '../models/entities/time-sheet.entity.js';
import { PerformanceReviewEntity } from '../models/entities/performance-review.entity.js';
import { Between, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { HolidayListEntity } from '../models/entities/holiday-list.entity.js';
import { OvertimeRuleDepartmentEntity } from '../models/entities/overtime-rule-department.entity.js';
import { PayrollConfigEntity } from '../models/entities/payroll-config.entity.js';

/**
 * Trạng thái bảng lương
 */
const PAYROLL_STATUS = {
    DRAFT: 'DRAFT',                     // Nháp - có thể chỉnh sửa
    PENDING_APPROVAL: 'PENDING_APPROVAL', // Chờ duyệt
    APPROVED: 'APPROVED',               // Đã duyệt
    LOCKED: 'LOCKED',                   // Đã khóa - không thể chỉnh sửa
};

/**
 * Tỷ lệ bảo hiểm cố định theo luật Việt Nam
 * (Không cho phép chỉnh sửa trên giao diện)
 */
const INSURANCE_RATES = {
    SOCIAL: 8,         // BHXH - Bảo hiểm xã hội: 8%
    HEALTH: 1.5,       // BHYT - Bảo hiểm y tế: 1.5%
    UNEMPLOYMENT: 1,   // BHTN - Bảo hiểm thất nghiệp: 1%
    UNION: 0,          // KPCĐ - Kinh phí công đoàn: 0%
};

/**
 * Khoản khấu trừ thuế TNCN cá nhân (VND/tháng)
 */
const PIT_PERSONAL_DEDUCTION = 11_000_000;

/**
 * Service xử lý nghiệp vụ Payroll
 */
export class PayrollService {
    constructor(payrollRepository, payrollDetailRepository) {
        this.payrollRepository = payrollRepository;
        this.payrollDetailRepository = payrollDetailRepository;
    }

    // ═══════════════════════════════════════════════════════════════
    // UC27 - TẠO BẢNG LƯƠNG & TÍNH LƯƠNG TỰ ĐỘNG
    // ═══════════════════════════════════════════════════════════════

    /**
     * Tạo bảng lương mới cho một kỳ lương
     * @param {Object} dto - { payrollMonth, payrollYear, employeeIds }
     */
    async create(dto) {
        const { payrollMonth, payrollYear, employeeIds = [] } = dto;

        // Kiểm tra đã tồn tại bảng lương cho kỳ này chưa
        const existing = await this.payrollRepository.findByPeriod(payrollMonth, payrollYear);
        if (existing) {
            throw new ConflictException(AppMessages.Errors.Payroll.ALREADY_EXISTS);
        }

        // Tạo bảng lương mới với trạng thái Nháp
        const payroll = await this.payrollRepository.create({
            payrollMonth,
            payrollYear,
            payrollStatus: PAYROLL_STATUS.DRAFT,
        });

        // Tạo chi tiết lương cho các nhân viên được chọn
        if (employeeIds && employeeIds.length > 0) {
            const detailData = employeeIds.map(id => ({
                payrollId: payroll.id,
                employeeId: id,
                netSalary: 0,
            }));
            await this.payrollDetailRepository.bulkCreate(detailData);
        }

        return payroll;
    }

    /**
     * Tính lương tự động cho tất cả nhân viên trong bảng lương
     *
     * Luồng xử lý:
     * 1. Lấy danh sách nhân viên trong bảng lương
     * 2. Fetch performance_reviews để lấy P2
     * 3. Tính số ngày công chuẩn trong tháng
     * 4. Fetch timesheets để lấy dữ liệu chấm công
     * 5. Tính lương chi tiết cho từng nhân viên
     */
    async autoCalculate(payrollId) {
        const payroll = await this._findPayrollOrFail(payrollId);

        // Không cho tính lương nếu bảng lương đã bị khóa
        if (payroll.payrollStatus === PAYROLL_STATUS.LOCKED) {
            throw new BadRequestException(AppMessages.Errors.Payroll.IS_LOCKED);
        }

        const { payrollMonth, payrollYear } = payroll;

        // ── Bước 1: Lấy danh sách nhân viên ──
        const existingDetails = await this.payrollDetailRepository.findByPayroll(payrollId);
        const employees = existingDetails.map(d => d.employee).filter(Boolean);
        if (employees.length === 0) return { calculated: 0, details: [] };

        const empIds = employees.map(e => e.id);

        // ── Bước 2: Lấy performance_reviews để tính % KPI ──
        // performance_reviews chứa điểm đánh giá:
        // - kpiScore: điểm KPI
        // - P2.1: sum(1.1-1.5) = scoreCompliance + scoreAttitude + scoreLearning + scoreTeamwork + scoreSkills
        // - P2.2: scoreResult
        const perfRepo = AppDataSource.getRepository(PerformanceReviewEntity);
        const perfReviews = await perfRepo.find({
            where: {
                reviewMonth: payrollMonth,
                reviewYear: payrollYear,
                employeeId: In(empIds),
                status: 'SUBMITTED',
                isDeleted: false,
            },
        });

        // ── Bước 3: Tính số ngày công chuẩn ──
        const startDate = new Date(payrollYear, payrollMonth - 1, 1);
        const endDate = new Date(payrollYear, payrollMonth, 0, 23, 59, 59);
        const holidayDates = await this._getHolidayDates(startDate, endDate);
        const standardDaysMonth = this._countWorkingDays(payrollYear, payrollMonth, holidayDates) || 22;

        // ── Bước 4: Lấy dữ liệu chấm công ──
        const timesheetRepo = AppDataSource.getRepository(TimeSheetEntity);
        const timesheets = await timesheetRepo.find({
            where: { month: payrollMonth, year: payrollYear, employeeId: In(empIds), isDeleted: false },
        });

        // ── Bước 5: Lấy quy tắc tính OT ──
        const { activeRules, ruleDepts } = await this._getOTRules();

        // ── Bước 6: Tính lương cho từng nhân viên ──
        const details = [];
        for (const employee of employees) {
            const existingDetail = existingDetails.find(d => d.employeeId === employee.id);

            // Lấy lương P2 từ bảng employee_salaries
            const salary = await this._getEmployeeSalary(employee.id);
            if (!salary) continue;

            // Lấy điểm đánh giá từ performance_reviews
            const perf = perfReviews.find(p => p.employeeId === employee.id);

            // Lương P2 = performanceSalary từ employee_salaries
            const performanceSalary = parseFloat(salary.performanceSalary) || 0;

            // Cấu trúc điểm performance_reviews:
            // 1.1-1.5: Mỗi tiêu chí max 1.0, tổng max = 5.0
            // 2.1 (scoreResult): max 5.0
            // Total: max 10.0 → P2.1 max 50%, P2.2 max 50%
            // Sum điểm 1.1-1.5 (max 5.0) → P2.1%
            // scoreResult (max 5.0) → P2.2%
            const sumScore11to15 = perf ? (
                parseFloat(perf.scoreCompliance || 0) +
                parseFloat(perf.scoreAttitude || 0) +
                parseFloat(perf.scoreLearning || 0) +
                parseFloat(perf.scoreTeamwork || 0) +
                parseFloat(perf.scoreSkills || 0)
            ) : 0;

            // % P2.1 = sum(1.1-1.5) / 5 * 50%
            const p21Percent = perf ? (sumScore11to15 / 5 * 50) : 0;
            // % P2.2 = scoreResult / 5 * 50%
            const p22Percent = perf ? (parseFloat(perf.scoreResult || 0) / 5 * 50) : 0;

            // Lấy timesheet
            const ts = timesheets.find(t => t.employeeId === employee.id);
            if (!ts) continue;

            const tsStdDays = parseFloat(ts.standardDays) || standardDaysMonth;
            const workingDays = this._calcWorkingDays(ts);

            // Tính lương OT
            const overtimePay = this._calcOvertimePay(
                ts, salary.baseSalary, tsStdDays, employee.departmentId, activeRules, ruleDepts
            );

            // Tính lương thực nhận (P1, P2.1, P2.2, TV)
            const { earnedP1, earnedP21, earnedP22, probationSalary } = this._calcEarnedSalaries(
                salary, ts, tsStdDays, workingDays, p21Percent, p22Percent, employee.employmentStatus
            );

            // Tính bảo hiểm (dùng tỷ lệ cố định)
            const insuranceBase = Math.min(parseFloat(salary.baseSalary) || 0, 20 * 2_340_000);
            const socialInsurance = parseFloat((insuranceBase * INSURANCE_RATES.SOCIAL / 100).toFixed(2));
            const healthInsurance = parseFloat((insuranceBase * INSURANCE_RATES.HEALTH / 100).toFixed(2));
            const unemploymentInsurance = parseFloat((insuranceBase * INSURANCE_RATES.UNEMPLOYMENT / 100).toFixed(2));
            const unionFee = parseFloat((insuranceBase * INSURANCE_RATES.UNION / 100).toFixed(2));
            const insuranceDeduction = socialInsurance + healthInsurance + unemploymentInsurance + unionFee;

            // Tính thuế TNCN
            const totalOfficialSalary = earnedP1 + earnedP21 + earnedP22 + probationSalary;
            const earnedAllowances = this._calcEarnedAllowances(salary, ts, tsStdDays, workingDays);
            const taxableIncome = totalOfficialSalary + earnedAllowances + overtimePay - insuranceDeduction - PIT_PERSONAL_DEDUCTION;
            const taxDeduction = taxableIncome > 0 ? this._calcPIT(taxableIncome) : 0;

            // Tính lương thực nhận
            const bonus = parseFloat(existingDetail?.bonus || 0);
            const penalty = parseFloat(existingDetail?.penalty || 0);
            const deduction = parseFloat(existingDetail?.deduction || 0);
            const netSalary = parseFloat((totalOfficialSalary + earnedAllowances + overtimePay + bonus - penalty - deduction).toFixed(2));

            // Chi phí công ty (BH phía công ty đóng)
            const companySocial = parseFloat((insuranceBase * 0.175).toFixed(2));
            const companyHealth = parseFloat((insuranceBase * 0.03).toFixed(2));
            const companyUnemployment = parseFloat((insuranceBase * 0.01).toFixed(2));
            const companyUnion = parseFloat((insuranceBase * 0.02).toFixed(2));
            const totalHrCost = netSalary + insuranceDeduction + taxDeduction + companySocial + companyHealth + companyUnemployment + companyUnion;

            // Lưu chi tiết lương
            const detailData = {
                payrollId, employeeId: employee.id,
                workingDays, baseSalary: salary.baseSalary, overtimePay: parseFloat(overtimePay.toFixed(2)),
                bonus, penalty, deduction, insuranceDeduction, taxDeduction, netSalary,
                allowanceAmount: parseFloat(earnedAllowances.toFixed(2)),
                standardDays: tsStdDays,
                officialDays: parseFloat(ts.officialDays || 0),
                probationDays: parseFloat(ts.probationDays || 0),
                businessTripDays: parseFloat(ts.businessTripDays || 0),
                holidayDays: parseFloat(ts.holidayDays || 0),
                benefitLeaveDays: parseFloat(ts.benefitLeaveDays || 0),
                waitingDays: parseFloat(ts.waitingDays || 0),
                nightShiftOfficialDays: parseFloat(ts.nightShiftOfficialDays || 0),
                nightShiftProbationDays: parseFloat(ts.nightShiftProbationDays || 0),
                otWeekday: parseFloat(ts.otWeekday || 0),
                otWeekdayNight: parseFloat(ts.otWeekdayNight || 0),
                otWeekend: parseFloat(ts.otWeekend || 0),
                otWeekendNight: parseFloat(ts.otWeekendNight || 0),
                otHoliday: parseFloat(ts.otHoliday || 0),
                otHolidayNight: parseFloat(ts.otHolidayNight || 0),
                totalOtHours: this._sumOTHours(ts),
                mealCount: parseFloat(ts.mealCount || 0),
                // Lương P2 từ employee_salaries
                performanceSalary: performanceSalary,
                // % P2.1, % P2.2, % KPI tổng từ performance_reviews (đã tính %)
                p1p2Percentage: p21Percent,
                p3Percentage: p22Percent,
                kpiPercentage: p21Percent + p22Percent,  // Tổng KPI = P2.1 + P2.2
                // Lương P2.1, P2.2 thực = performanceSalary × % / 100 × hệ số ngày công
                p1Amount: earnedP1,
                p21Amount: earnedP21,
                p22Amount: earnedP22,
                probationAmount: probationSalary,
                socialInsurance, healthInsurance, unemploymentInsurance,
                socialInsurancePercentage: INSURANCE_RATES.SOCIAL,
                healthInsurancePercentage: INSURANCE_RATES.HEALTH,
                unemploymentInsurancePercentage: INSURANCE_RATES.UNEMPLOYMENT,
                unionFeePercentage: INSURANCE_RATES.UNION,
                taxableIncomePaid: taxableIncome > 0 ? taxableIncome : 0,
                companySocialInsurance: companySocial,
                companyHealthInsurance: companyHealth,
                companyUnemploymentInsurance: companyUnemployment,
                companyUnionFee: companyUnion,
                unionFee,
                totalHrCost: parseFloat(totalHrCost.toFixed(2)),
            };

            details.push(
                existingDetail
                    ? await this.payrollDetailRepository.update(existingDetail.id, detailData)
                    : await this.payrollDetailRepository.create(detailData)
            );
        }
        return { calculated: details.length, details };
    }

    // ═══════════════════════════════════════════════════════════════
    // CÁC PHƯƠNG THỨC HỖ TRỢ (PRIVATE)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Lấy danh sách ngày lễ trong khoảng thời gian
     */
    async _getHolidayDates(startDate, endDate) {
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
            let cur = new Date(h.startDate);
            const stop = new Date(h.endDate || h.startDate);
            while (cur <= stop) {
                holidayDates.add(cur.toISOString().split('T')[0]);
                cur.setDate(cur.getDate() + 1);
            }
        });
        return holidayDates;
    }

    /**
     * Lấy quy tắc tính lương OT (làm thêm giờ)
     */
    async _getOTRules() {
        const ruleRepo = AppDataSource.getRepository(OvertimeRuleEntity);
        const ruleDeptRepo = AppDataSource.getRepository(OvertimeRuleDepartmentEntity);
        const activeRules = await ruleRepo.find({
            where: { versionStatus: 'ACTIVE', status: 'ACTIVE', isDeleted: false },
            relations: ['overtimeType'],
        });
        const ruleDepts = await ruleDeptRepo.find({ where: { isDeleted: false } });
        return { activeRules, ruleDepts };
    }

    /**
     * Lấy lương của nhân viên (ưu tiên bản ghi có trạng thái ACTIVE)
     */
    async _getEmployeeSalary(employeeId) {
        const salaryRepo = AppDataSource.getRepository(EmployeeSalaryEntity);
        const salaries = await salaryRepo.find({
            where: { employeeId, isDeleted: false },
            order: { createdAt: 'DESC' },
        });
        const preferred = ['ACTIVE', 'APPROVED', 'ACTIVE_MEMBER'];
        return salaries.find(s => preferred.includes(String(s.salaryStatus || '').trim().toUpperCase())) || salaries[0];
    }

    /**
     * Đếm số ngày làm việc trong tháng (trừ T7, CN và ngày lễ)
     */
    _countWorkingDays(year, month, holidayDates) {
        const daysInMonth = new Date(year, month, 0).getDate();
        let count = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const dayOfWeek = date.getDay();
            // Trừ Thứ Bảy (6) và Chủ Nhật (0)
            if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
        }
        return count;
    }

    /**
     * Tính tổng ngày công (chính thức + thử việc + công tác + lễ + chế độ)
     */
    _calcWorkingDays(ts) {
        return (
            parseFloat(ts?.officialDays || 0) +
            parseFloat(ts?.probationDays || 0) +
            parseFloat(ts?.businessTripDays || 0) +
            parseFloat(ts?.holidayDays || 0) +
            parseFloat(ts?.benefitLeaveDays || 0)
        );
    }

    /**
     * Tính tổng giờ OT
     */
    _sumOTHours(ts) {
        return (
            parseFloat(ts?.otWeekday || 0) +
            parseFloat(ts?.otWeekdayNight || 0) +
            parseFloat(ts?.otWeekend || 0) +
            parseFloat(ts?.otWeekendNight || 0) +
            parseFloat(ts?.otHoliday || 0) +
            parseFloat(ts?.otHolidayNight || 0)
        );
    }

    /**
     * Lấy hệ số nhân lương OT theo loại
     * WEEKDAY: ngày thường (mặc định 1.5)
     * WEEKEND: cuối tuần (mặc định 2.0)
     * HOLIDAY: ngày lễ (mặc định 3.0)
     * Làm đêm: +0.1
     */
    _getOTMultiplier(typeCode, isNight, departmentId, activeRules, ruleDepts) {
        const rule = activeRules.find(r =>
            r.overtimeType?.code === typeCode &&
            (ruleDepts.filter(rd => rd.overtimeRuleId === r.id).length === 0 ||
                ruleDepts.some(rd => rd.overtimeRuleId === r.id && rd.departmentId === departmentId))
        );
        let m = rule ? parseFloat(rule.salaryMultiplier || 1.5) : (typeCode === 'WEEKDAY' ? 1.5 : typeCode === 'WEEKEND' ? 2.0 : 3.0);
        if (isNight) m += 0.1;
        return m;
    }

    /**
     * Tính lương làm thêm giờ (OT)
     * Công thức: Giờ OT × Lương giờ × Hệ số nhân
     * Lương giờ = Lương cơ bản / (Số ngày công chuẩn × 8)
     */
    _calcOvertimePay(ts, baseSalary, standardDays, departmentId, activeRules, ruleDepts) {
        const hourlyRate = standardDays > 0 ? parseFloat(baseSalary || 0) / (standardDays * 8) : 0;
        const { otWeekday, otWeekdayNight, otWeekend, otWeekendNight, otHoliday, otHolidayNight } = {
            otWeekday: parseFloat(ts?.otWeekday || 0),
            otWeekdayNight: parseFloat(ts?.otWeekdayNight || 0),
            otWeekend: parseFloat(ts?.otWeekend || 0),
            otWeekendNight: parseFloat(ts?.otWeekendNight || 0),
            otHoliday: parseFloat(ts?.otHoliday || 0),
            otHolidayNight: parseFloat(ts?.otHolidayNight || 0),
        };
        let pay = 0;
        pay += otWeekday * hourlyRate * this._getOTMultiplier('WEEKDAY', false, departmentId, activeRules, ruleDepts);
        pay += otWeekdayNight * hourlyRate * this._getOTMultiplier('WEEKDAY', true, departmentId, activeRules, ruleDepts);
        pay += otWeekend * hourlyRate * this._getOTMultiplier('WEEKEND', false, departmentId, activeRules, ruleDepts);
        pay += otWeekendNight * hourlyRate * this._getOTMultiplier('WEEKEND', true, departmentId, activeRules, ruleDepts);
        pay += otHoliday * hourlyRate * this._getOTMultiplier('HOLIDAY', false, departmentId, activeRules, ruleDepts);
        pay += otHolidayNight * hourlyRate * this._getOTMultiplier('HOLIDAY', true, departmentId, activeRules, ruleDepts);
        return pay;
    }

    /**
     * Tính lương thực nhận theo ngày công
     *
     * Công thức:
     * - P1 thực nhận = (Lương P1 / Công chuẩn) × Ngày công đủ
     * - P2.1 thực nhận = (P2 × %P2.1 / 100 / Công chuẩn) × Ngày công đủ
     * - P2.2 thực nhận = (P2 × %P2.2 / 100 / Công chuẩn) × Ngày công đủ
     * - Lương TV = (Lương P1 / Công chuẩn) × Ngày công TV × 85%
     */
    _calcEarnedSalaries(salary, ts, standardDays, workingDays, p21Percent, p22Percent, employmentStatus) {
        const p1Amount = parseFloat(salary.baseSalary) || 0;
        const performanceSalary = parseFloat(salary.performanceSalary) || 0;

        // P2.1 base = performanceSalary × %P2.1 / 100
        // p21Percent đã là % (ví dụ: 45 = 45%)
        const p21Base = performanceSalary * p21Percent / 100;
        // P2.2 base = performanceSalary × %P2.2 / 100
        const p22Base = performanceSalary * p22Percent / 100;

        const isProbation = employmentStatus === 'PROBATION';
        const fullPayDays = (isProbation ? 0 : parseFloat(ts?.businessTripDays || 0)) +
            parseFloat(ts?.officialDays || 0) +
            parseFloat(ts?.holidayDays || 0) +
            parseFloat(ts?.benefitLeaveDays || 0);
        const probationPayDays = (isProbation ? parseFloat(ts?.businessTripDays || 0) : 0) +
            parseFloat(ts?.probationDays || 0);

        // Hệ số ngày công = ngày công thực tế / công chuẩn
        const dayFactor = standardDays > 0 ? fullPayDays / standardDays : 0;

        const earnedP1 = p1Amount * dayFactor;
        const earnedP21 = p21Base * dayFactor;
        const earnedP22 = p22Base * dayFactor;
        const probationSalary = standardDays > 0 ? (p1Amount / standardDays) * probationPayDays * 0.85 : 0;

        return { earnedP1, earnedP21, earnedP22, probationSalary };
    }

    /**
     * Tính phụ cấp thực nhận theo ngày công
     */
    _calcEarnedAllowances(salary, ts, standardDays, workingDays) {
        const totalAllowances = (
            parseFloat(salary.lunchAllowance || 0) +
            parseFloat(salary.fuelAllowance || 0) +
            parseFloat(salary.phoneAllowance || 0) +
            parseFloat(salary.otherAllowance || 0)
        );
        return standardDays > 0 ? (totalAllowances / standardDays) * workingDays : 0;
    }

    // ═══════════════════════════════════════════════════════════════
    // CẬP NHẬT CHI TIẾT LƯƠNG (KHI USER CHỈNH SỬA TRÊN GIAO DIỆN)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Cập nhật chi tiết lương khi user chỉnh sửa thủ công
     * Chỉ áp dụng với các trường cho phép sửa (thưởng, phạt, phụ cấp, etc.)
     */
    async updateDetail(detailId, dto) {
        const detail = await this.payrollDetailRepository.findById(detailId);
        if (!detail) throw new NotFoundException(AppMessages.Errors.Payroll.DETAIL_NOT_FOUND);

        const payroll = await this._findPayrollOrFail(detail.payrollId);
        if (payroll.payrollStatus === PAYROLL_STATUS.LOCKED) {
            throw new BadRequestException(AppMessages.Errors.Payroll.IS_LOCKED);
        }

        // Các trường ngày công
        const standardDays = parseFloat(dto.standardDays ?? detail.standardDays ?? 22);
        const workingDays = parseFloat(dto.workingDays ?? detail.workingDays ?? 0);
        const officialDays = parseFloat(dto.officialDays ?? detail.officialDays ?? 0);
        const probationDays = parseFloat(dto.probationDays ?? detail.probationDays ?? 0);
        const businessTripDays = parseFloat(dto.businessTripDays ?? detail.businessTripDays ?? 0);
        const holidayDays = parseFloat(dto.holidayDays ?? detail.holidayDays ?? 0);
        const benefitLeaveDays = parseFloat(dto.benefitLeaveDays ?? detail.benefitLeaveDays ?? 0);

        // Các trường OT
        let otWeekday = parseFloat(dto.otWeekday ?? detail.otWeekday ?? 0);
        let otWeekdayNight = parseFloat(dto.otWeekdayNight ?? detail.otWeekdayNight ?? 0);
        let otWeekend = parseFloat(dto.otWeekend ?? detail.otWeekend ?? 0);
        let otWeekendNight = parseFloat(dto.otWeekendNight ?? detail.otWeekendNight ?? 0);
        let otHoliday = parseFloat(dto.otHoliday ?? detail.otHoliday ?? 0);
        let otHolidayNight = parseFloat(dto.otHolidayNight ?? detail.otHolidayNight ?? 0);
        const totalOtHours = dto.totalOtHours !== undefined
            ? parseFloat(dto.totalOtHours)
            : (otWeekday + otWeekdayNight + otWeekend + otWeekendNight + otHoliday + otHolidayNight);

        // Fallback: nếu chỉ cập nhật totalOtHours mà không có breakdown
        const breakdownSum = otWeekday + otWeekdayNight + otWeekend + otWeekendNight + otHoliday + otHolidayNight;
        if (dto.totalOtHours !== undefined && breakdownSum === 0 && totalOtHours > 0) {
            otWeekday = totalOtHours;
        }

        // P2 từ employee_salaries (đã lưu từ autoCalculate hoặc mặc định)
        // % KPI, % P2.1, % P2.2 từ performance_reviews (đã được tính % khi autoCalculate)
        const p21Percent = parseFloat(dto.p1p2Percentage ?? detail.p1p2Percentage ?? 0);
        const p22Percent = parseFloat(dto.p3Percentage ?? detail.p3Percentage ?? 0);

        // Tỷ lệ bảo hiểm cố định
        const socialInsurancePercentage = INSURANCE_RATES.SOCIAL;
        const healthInsurancePercentage = INSURANCE_RATES.HEALTH;
        const unemploymentInsurancePercentage = INSURANCE_RATES.UNEMPLOYMENT;
        const unionFeePercentage = INSURANCE_RATES.UNION;

        // Tính bảo hiểm
        const insuranceBase = Math.min(parseFloat(detail.baseSalary) || 0, 20 * 2_340_000);
        const socialInsurance = parseFloat((insuranceBase * socialInsurancePercentage / 100).toFixed(2));
        const healthInsurance = parseFloat((insuranceBase * healthInsurancePercentage / 100).toFixed(2));
        const unemploymentInsurance = parseFloat((insuranceBase * unemploymentInsurancePercentage / 100).toFixed(2));
        const unionFee = parseFloat((insuranceBase * unionFeePercentage / 100).toFixed(2));
        const insuranceDeduction = socialInsurance + healthInsurance + unemploymentInsurance + unionFee;

        // Tính OT
        const { activeRules, ruleDepts } = await this._getOTRules();
        const ts = {
            officialDays, probationDays, businessTripDays, holidayDays, benefitLeaveDays,
            otWeekday, otWeekdayNight, otWeekend, otWeekendNight, otHoliday, otHolidayNight
        };
        const overtimePay = this._calcOvertimePay(ts, detail.baseSalary, standardDays,
            detail.employee?.departmentId, activeRules, ruleDepts);

        // Tính lương thực nhận (dùng _calcEarnedSalaries để nhất quán)
        const { earnedP1, earnedP21, earnedP22, probationSalary } = this._calcEarnedSalaries(
            { baseSalary: detail.baseSalary, performanceSalary: detail.performanceSalary },
            ts,
            standardDays,
            workingDays,
            p21Percent,
            p22Percent,
            detail.employee?.employmentStatus
        );

        const totalOfficialSalary = earnedP1 + earnedP21 + earnedP22 + probationSalary;
        const earnedAllowances = this._calcEarnedAllowances({
            lunchAllowance: detail.lunchAllowance,
            fuelAllowance: detail.fuelAllowance,
            phoneAllowance: detail.phoneAllowance,
            otherAllowance: detail.otherAllowance
        }, { standardDays: detail.standardDays }, standardDays, workingDays);

        const bonus = parseFloat(dto.bonus ?? detail.bonus ?? 0);
        const penalty = parseFloat(dto.penalty ?? detail.penalty ?? 0);
        const deduction = parseFloat(dto.deduction ?? detail.deduction ?? 0);
        const netSalary = parseFloat((totalOfficialSalary + earnedAllowances + overtimePay + bonus - penalty - deduction).toFixed(2));

        return this.payrollDetailRepository.update(detailId, {
            bonus, deduction, penalty,
            standardDays, workingDays, officialDays, probationDays, businessTripDays, holidayDays, benefitLeaveDays,
            otWeekday, otWeekdayNight, otWeekend, otWeekendNight, otHoliday, otHolidayNight, totalOtHours,
            overtimePay: parseFloat(overtimePay.toFixed(2)),
            p1Amount: earnedP1, p21Amount: earnedP21, p22Amount: earnedP22, probationAmount: probationSalary,
            p1p2Percentage: p21Percent, p3Percentage: p22Percent,
            kpiPercentage: p21Percent + p22Percent,  // Tổng KPI = P2.1 + P2.2
            performanceSalary: detail.performanceSalary,
            socialInsurance, healthInsurance, unemploymentInsurance, unionFee,
            socialInsurancePercentage, healthInsurancePercentage, unemploymentInsurancePercentage, unionFeePercentage,
            insuranceDeduction, netSalary,
            note: dto.note ?? detail.note,
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // UC28 - QUẢN LÝ DỮ LIỆU BẢNG LƯƠNG (IMPORT/EXPORT)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Import chi tiết lương từ file Excel
     */
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

        const worksheet = workbook.getWorksheet(1);
        const importedData = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Bỏ header

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
                employeeCode: undefined,
                netSalary,
            });
            results.push(updated);
        }

        return { importedCount: results.length };
    }

    // ═══════════════════════════════════════════════════════════════
    // UC28 - XEM DANH SÁCH BẢNG LƯƠNG
    // ═══════════════════════════════════════════════════════════════

    /**
     * Lấy danh sách bảng lương (có phân trang)
     */
    async findAll(queryDto) {
        const result = await this.payrollRepository.findAll({
            month: queryDto.month,
            year: queryDto.year,
            status: queryDto.status,
            search: queryDto.search,
            skip: queryDto.skip,
            take: queryDto.take,
        });

        // Bổ sung số nhân viên và tổng lương cho mỗi bảng lương
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

    /**
     * Lấy chi tiết một bảng lương
     */
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

    /**
     * Cập nhật thông tin header của bảng lương
     */
    async update(id, data) {
        const payroll = await this._findPayrollOrFail(id);
        if (payroll.payrollStatus === PAYROLL_STATUS.LOCKED) {
            throw new BadRequestException(AppMessages.Errors.Payroll.IS_LOCKED);
        }
        return this.payrollRepository.update(id, data);
    }

    /**
     * Lấy chi tiết lương theo phòng ban
     */
    async getDetailsByDepartment(payrollId, departmentId) {
        await this._findPayrollOrFail(payrollId);
        return this.payrollDetailRepository.findByPayrollAndDepartment(payrollId, departmentId);
    }

    /**
     * Xuất file Excel tổng hợp bảng lương
     */
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

    // ═══════════════════════════════════════════════════════════════
    // UC29 - GỬI PHÊ DUYỆT & DUYỆT BẢNG LƯƠNG
    // ═══════════════════════════════════════════════════════════════

    /**
     * Gửi bảng lương để phê duyệt (Nháp → Chờ duyệt)
     */
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

    /**
     * Duyệt bảng lương (Chờ duyệt → Đã duyệt)
     */
    async approve(payrollId, userId) {
        const payroll = await this._findPayrollOrFail(payrollId);
        if (payroll.payrollStatus !== PAYROLL_STATUS.PENDING_APPROVAL) {
            throw new BadRequestException(AppMessages.Errors.Payroll.INVALID_STATUS_TRANSITION);
        }

        // Tìm employee từ userId để lưu người duyệt
        const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
        const employee = await employeeRepo.findOne({ where: { userId, isDeleted: false } });

        return this.payrollRepository.update(payrollId, {
            payrollStatus: PAYROLL_STATUS.APPROVED,
            approvedBy: employee?.id || null,
            approvedAt: new Date(),
        });
    }

    /**
     * Từ chối bảng lương (Chờ duyệt → Nháp)
     */
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

    // ═══════════════════════════════════════════════════════════════
    // UC30 - KHÓA BẢNG LƯƠNG & GỬI PHIẾU LƯƠNG
    // ═══════════════════════════════════════════════════════════════

    /**
     * Khóa bảng lương (Đã duyệt → Đã khóa)
     * Sau khi khóa không thể chỉnh sửa
     */
    async lock(payrollId) {
        const payroll = await this._findPayrollOrFail(payrollId);
        if (payroll.payrollStatus !== PAYROLL_STATUS.APPROVED) {
            throw new BadRequestException(AppMessages.Errors.Payroll.INVALID_STATUS_TRANSITION);
        }
        return this.payrollRepository.update(payrollId, { payrollStatus: PAYROLL_STATUS.LOCKED });
    }

    /**
     * Mở khóa bảng lương (Đã khóa → Đã duyệt)
     */
    async unlock(payrollId) {
        const payroll = await this._findPayrollOrFail(payrollId);
        if (payroll.payrollStatus !== PAYROLL_STATUS.LOCKED) {
            throw new BadRequestException(AppMessages.Errors.Payroll.NOT_LOCKED);
        }
        return this.payrollRepository.update(payrollId, { payrollStatus: PAYROLL_STATUS.APPROVED });
    }

    /**
     * Gửi phiếu lương qua email cho tất cả nhân viên
     * Chỉ thực hiện khi bảng lương đã bị khóa
     */
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

        // Đánh dấu tất cả details đã được gửi
        await this.payrollDetailRepository.bulkUpdateSentAt(payrollId, new Date());

        return { sent: sentCount, total: details.length };
    }

    /**
     * Gửi phiếu lương qua email cho các nhân viên được chọn (theo detailIds)
     * Không yêu cầu bảng lương phải bị khóa — cho phép gửi ở mọi trạng thái.
     * @param {number} payrollId
     * @param {number[]} detailIds - Danh sách ID của payroll_details cần gửi
     */
    async sendPayslipsToSelected(payrollId, detailIds = []) {
        const payroll = await this._findPayrollOrFail(payrollId);

        if (!detailIds || detailIds.length === 0) {
            throw new BadRequestException('Vui lòng chọn ít nhất một nhân viên để gửi phiếu lương.');
        }

        const allDetails = await this.payrollDetailRepository.findByPayroll(payrollId);
        const selectedDetails = allDetails.filter(d => detailIds.includes(d.id));

        if (selectedDetails.length === 0) {
            throw new BadRequestException('Không tìm thấy dữ liệu phiếu lương cho các nhân viên đã chọn.');
        }

        let sentCount = 0;
        const failedEmails = [];

        for (const detail of selectedDetails) {
            const email = detail.employee?.companyEmail || detail.employee?.user?.email;
            if (!email) {
                console.warn(`[PayrollService] Nhân viên ${detail.employee?.fullName} (ID: ${detail.employeeId}) không có email.`);
                failedEmails.push({ name: detail.employee?.fullName, reason: 'Không có email' });
                continue;
            }

            const html = this._buildPayslipHtml(detail, payroll);
            try {
                await sendMail(
                    email,
                    `Phiếu lương Tháng ${payroll.payrollMonth}/${payroll.payrollYear} - SmartHR`,
                    '',
                    html
                );
                sentCount++;
                // Đánh dấu đã gửi cho record này
                await this.payrollDetailRepository.update(detail.id, { payslipSentAt: new Date() });
            } catch (err) {
                console.error(`[PayrollService] Lỗi gửi phiếu lương tới ${email}:`, err.message);
                failedEmails.push({ name: detail.employee?.fullName, email, reason: err.message });
            }
        }

        return {
            sent: sentCount,
            total: selectedDetails.length,
            failed: failedEmails,
        };
    }

    /**
     * Xuất file Excel phiếu lương cho từng nhân viên
     */
    async exportPayslips(payrollId) {
        const payroll = await this._findPayrollOrFail(payrollId);
        const details = await this.payrollDetailRepository.findByPayroll(payrollId);

        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.default.Workbook();

        for (const detail of details) {
            const emp = detail.employee;
            const sheetName = (emp?.employeeCode || emp?.fullName || `NV${detail.employeeId}`)
                .replace(/[*?:\/\\[\]]/g, '')
                .substring(0, 31);

            const ws = workbook.addWorksheet(sheetName);

            // Tiêu đề
            ws.mergeCells('A1:D1');
            const titleCell = ws.getCell('A1');
            titleCell.value = `PHIẾU LƯƠNG - Tháng ${payroll.payrollMonth}/${payroll.payrollYear}`;
            titleCell.font = { bold: true, size: 14 };
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            ws.getRow(1).height = 30;

            // Thông tin nhân viên
            ws.mergeCells('A2:D2');
            const empCell = ws.getCell('A2');
            empCell.value = `Nhân viên: ${emp?.fullName || ''} (${emp?.employeeCode || ''}) | Phòng ban: ${emp?.department?.departmentName || ''}`;
            empCell.font = { italic: true, size: 11 };
            empCell.alignment = { horizontal: 'center' };

            // Chi tiết lương
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

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Tìm bảng lương hoặc throw NotFoundException
     */
    async _findPayrollOrFail(id) {
        const payroll = await this.payrollRepository.findById(id);
        if (!payroll) throw new NotFoundException(AppMessages.Errors.Payroll.NOT_FOUND);
        return payroll;
    }

    /**
     * Tính thuế TNCN theo biểu thuế lũy tiến từng phần
     *
     * Bậc thuế:
     * - Đến 5 triệu: 5%
     * - Trên 5 đến 10 triệu: 10%
     * - Trên 10 đến 18 triệu: 15%
     * - Trên 18 đến 32 triệu: 20%
     * - Trên 32 đến 52 triệu: 25%
     * - Trên 52 đến 80 triệu: 30%
     * - Trên 80 triệu: 35%
     */
    _calcPIT(taxableIncome) {
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

    /**
     * Tạo HTML cho phiếu lương email
     */
    _buildPayslipHtml(detail, payroll) {
        const emp = detail.employee;
        const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(parseFloat(n || 0)));
        const sentDate = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

        const p2Amount = Number(detail.p21Amount || 0) + Number(detail.p22Amount || 0);
        const totalEarnings = Number(detail.p1Amount || detail.baseSalary || 0) + p2Amount +
            Number(detail.probationAmount || 0) + Number(detail.allowanceAmount || 0) +
            Number(detail.overtimePay || 0) + Number(detail.bonus || 0);
        const totalDeductions = Number(detail.insuranceDeduction || 0) + Number(detail.taxDeduction || 0) +
            Number(detail.deduction || 0) + Number(detail.penalty || 0);

        const rowStyle = 'padding: 9px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px;';
        const labelStyle = `${rowStyle} color: #475569; width: 60%;`;
        const valueStyle = `${rowStyle} text-align: right; font-weight: 600; color: #1e293b;`;
        const deductStyle = `${rowStyle} text-align: right; font-weight: 600; color: #dc2626;`;

        const incomeRow = (label, amount) => amount > 0 ? `
            <tr>
                <td style="${labelStyle}">${label}</td>
                <td style="${valueStyle}">+${fmt(amount)} ₫</td>
            </tr>` : '';

        const deductRow = (label, amount) => amount > 0 ? `
            <tr>
                <td style="${labelStyle}">${label}</td>
                <td style="${deductStyle}">−${fmt(amount)} ₫</td>
            </tr>` : '';

        return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Phiếu lương Tháng ${payroll.payrollMonth}/${payroll.payrollYear}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">

  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:32px 32px 24px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,0.7);text-transform:uppercase;">SmartHR System</p>
      <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">PHIẾU LƯƠNG</h1>
      <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">Tháng ${payroll.payrollMonth}/${payroll.payrollYear} &nbsp;•&nbsp; Ngày gửi: ${sentDate}</p>
    </td>
  </tr>

  <!-- Employee Info -->
  <tr>
    <td style="padding:20px 32px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:48px;vertical-align:top;">
            <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#818cf8,#6366f1);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:white;text-align:center;line-height:42px;">
              ${(emp?.fullName || 'N')[0].toUpperCase()}
            </div>
          </td>
          <td style="padding-left:12px;vertical-align:top;">
            <p style="margin:0;font-size:16px;font-weight:800;color:#1e293b;">${emp?.fullName || '—'}</p>
            <p style="margin:3px 0 0;font-size:12px;color:#64748b;">
              <span style="background:#e0e7ff;color:#4338ca;padding:2px 8px;border-radius:20px;font-weight:700;margin-right:8px;">${emp?.employeeCode || '—'}</span>
              ${emp?.position?.positionName || ''} &nbsp;|&nbsp; ${emp?.department?.departmentName || ''}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Income Section -->
  <tr>
    <td style="padding:24px 32px 0;">
      <p style="margin:0 0 10px;font-size:11px;font-weight:800;letter-spacing:1.5px;color:#64748b;text-transform:uppercase;">Thu nhập</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        ${incomeRow('Lương vị trí thực nhận (P1)', detail.p1Amount || detail.baseSalary)}
        ${incomeRow('Thưởng hiệu quả công việc (P2)', p2Amount)}
        ${incomeRow('Lương thử việc', detail.probationAmount)}
        ${incomeRow('Phụ cấp', detail.allowanceAmount)}
        ${incomeRow('Làm thêm giờ (OT)', detail.overtimePay)}
        ${incomeRow('Thưởng', detail.bonus)}
        <tr style="background:#f0fdf4;">
          <td style="${labelStyle} font-weight:700; color:#166534;">Tổng thu nhập</td>
          <td style="${valueStyle} color:#16a34a;">+${fmt(totalEarnings)} ₫</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Deduction Section -->
  <tr>
    <td style="padding:20px 32px 0;">
      <p style="margin:0 0 10px;font-size:11px;font-weight:800;letter-spacing:1.5px;color:#64748b;text-transform:uppercase;">Các khoản trừ</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        ${deductRow('Bảo hiểm xã hội / Y tế / Thất nghiệp', detail.insuranceDeduction)}
        ${deductRow('Thuế thu nhập cá nhân (TNCN)', detail.taxDeduction)}
        ${deductRow('Khấu trừ khác', detail.deduction)}
        ${deductRow('Phạt / Vi phạm', detail.penalty)}
        <tr style="background:#fff7f7;">
          <td style="${labelStyle} font-weight:700; color:#991b1b;">Tổng khấu trừ</td>
          <td style="${deductStyle}">−${fmt(totalDeductions)} ₫</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- NET Salary -->
  <tr>
    <td style="padding:20px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:2px solid #6ee7b7;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:16px 20px;font-size:15px;font-weight:800;color:#065f46;">THỰC LĨNH (NET)</td>
          <td style="padding:16px 20px;text-align:right;font-size:20px;font-weight:900;color:#065f46;letter-spacing:-0.5px;">${fmt(detail.netSalary)} ₫</td>
        </tr>
      </table>
    </td>
  </tr>

  ${detail.note ? `
  <!-- Note -->
  <tr>
    <td style="padding:0 32px 16px;">
      <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;">
        <p style="margin:0;font-size:12px;color:#92400e;font-style:italic;"><strong>Ghi chú:</strong> ${detail.note}</p>
      </div>
    </td>
  </tr>` : ''}

  <!-- Footer -->
  <tr>
    <td style="padding:16px 32px 28px;border-top:1px solid #f1f5f9;">
      <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;line-height:1.6;">
        Đây là phiếu lương điện tử được tạo tự động bởi hệ thống <strong style="color:#6366f1;">SmartHR</strong>.<br/>
        Vui lòng liên hệ phòng Nhân sự nếu có thắc mắc. Không phản hồi email này.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
    }
}
