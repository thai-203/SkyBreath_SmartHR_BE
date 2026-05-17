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
import { PayrollAttachmentRepository } from '../repositories/payroll-attachment.repository.js';
import fs from 'fs';
import path from 'path';

/**
 * Trạng thái bảng lương
 */
const PAYROLL_STATUS = {
    DRAFT: 'DRAFT',
    PENDING_APPROVAL: 'PENDING_APPROVAL',
    APPROVED: 'APPROVED',
    LOCKED: 'LOCKED',
};

/**
 * Parse number từ nhiều định dạng:
 * - "22" → 22
 * - "19.000.002" → 19000002 (format Việt Nam - phân cách phần nghìn)
 * - "1.234.567,89" → 1234567.89 (format Việt Nam đầy đủ)
 * - "19,000,002" → 19000002 (format US)
 * - 22 → 22 (đã là number)
 */
function _parseNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') {
        // Loại bỏ NaN và Infinity
        if (isNaN(value) || !isFinite(value)) return 0;
        return value;
    }
    const str = String(value).trim();
    if (!str) return 0;

    // Xác định separator decimal (dấu phẩy hay dấu chấm)
    const lastCommaIdx = str.lastIndexOf(',');
    const lastDotIdx = str.lastIndexOf('.');

    let result;
    if (lastCommaIdx > lastDotIdx) {
        // Format Việt Nam: dấu phẩy là decimal separator
        // VD: "1.234.567,89" → "1234567.89"
        result = str.replace(/\./g, '').replace(',', '.');
    } else {
        // Format US hoặc chỉ có dấu chấm là decimal
        // VD: "1,234,567.89" → "1234567.89"
        result = str.replace(/,/g, '');
    }

    const num = parseFloat(result);
    if (isNaN(num) || !isFinite(num)) return 0;
    return num;
}

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
        this.attachmentRepository = new PayrollAttachmentRepository();
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

            // ── Phụ cấp thực nhận (43) ──
            const earnedAllowances = this._calcTotalAllowances(salary);

            // ── Các khoản nhập tay đã có từ lần tính trước ──
            const bonus               = parseFloat(existingDetail?.bonus                || 0); // (36.1) Thưởng P3
            const insuranceAdjustment = parseFloat(existingDetail?.insuranceAdjustment || 0); // (53) Truy thu BH
            const employeeUnionFee    = parseFloat(existingDetail?.employeeUnionFee    || 0); // (54) CĐ phí NLĐ
            const partyFee            = parseFloat(existingDetail?.partyFee            || 0); // (55) Đảng phí
            const taxAdjustment       = parseFloat(existingDetail?.taxAdjustment       || 0); // (64) Truy thu thuế
            const otherDeduction      = parseFloat(existingDetail?.otherDeduction      || 0); // (65) Trừ khác
            const adjustmentTaxable   = parseFloat(existingDetail?.adjustmentTaxable   || 0); // (46) Truy thu tính thuế
            const adjustmentNonTaxable= parseFloat(existingDetail?.adjustmentNonTaxable|| 0); // (47) Truy thu không thuế
            const otherNonTaxable     = parseFloat(existingDetail?.otherNonTaxable     || 0); // (50.1) Khác không thuế

            // ── Tổng thu nhập (51) ──
            const totalGrossIncome = this._calcTotalGrossIncome({
                earnedP1, earnedP21, earnedP22, probationSalary,
                bonus,
                allowanceAmount: earnedAllowances,
                overtimePay,
                adjustmentTaxable,
                adjustmentNonTaxable,
                otherNonTaxable,
            });

            // ── Tính bảo hiểm (52) ──
            // Mức đóng BH giới hạn trần 46.8 triệu (20 × mức lương cơ sở), tính theo tổng thu nhập
            const insuranceBase = this._calcInsuranceBase(totalGrossIncome);
            const insurance = this._calcEmployeeInsurance(insuranceBase);
            const { social: socialInsurance, health: healthInsurance, unemployment: unemploymentInsurance } = insurance;
            const insuranceDeduction = insurance.total; // (52) = 10.5%

            // ── Giảm trừ gia cảnh (12.2) ──
            // Số NPT lấy từ dữ liệu đã nhập trước (mặc định 0 nếu chưa có)
            const dependentCount  = parseInt(existingDetail?.dependentCount || 0);
            const familyDeduction = this._calcFamilyDeduction(dependentCount); // = NPT×4.4tr + 11tr

            // ── Thu nhập tính thuế (12.3) & Thuế TNCN (63) ──
            const taxableIncome = this._calcTaxableIncome(totalGrossIncome, insuranceDeduction, familyDeduction);
            const taxDeduction  = taxableIncome > 0 ? this._calcPIT(taxableIncome) : 0; // (63)

            // ── Tổng khấu trừ (65.1) & Lương thực nhận NET (66) ──
            const totalDeduction = this._calcTotalDeduction({
                insuranceDeduction, insuranceAdjustment, employeeUnionFee,
                partyFee, taxDeduction, taxAdjustment, otherDeduction,
            });
            const netSalary = this._calcNetSalary(totalGrossIncome, totalDeduction); // (66)

            // ── Chi phí phía công ty ──
            // BH công ty đóng: BHXH 17.5% + BHYT 3% + BHTN 1% = 21.5%
            const companySocial       = parseFloat((insuranceBase * 0.175).toFixed(2)); // 17.5% BHXH
            const companyHealth       = parseFloat((insuranceBase * 0.03 ).toFixed(2)); // 3%    BHYT
            const companyUnemployment = parseFloat((insuranceBase * 0.01 ).toFixed(2)); // 1%    BHTN
            const companyUnion        = parseFloat((insuranceBase * 0.02 ).toFixed(2)); // 2%    KPCĐ (71)
            const companyInsurance    = companySocial + companyHealth + companyUnemployment; // (75)
            // (79.1) = (51) + (71) + (75) — dùng totalGrossIncome chứ không phải netSalary
            const totalHrCost = this._calcTotalHrCost(totalGrossIncome, companyUnion, companyInsurance);

            // ── Lưu chi tiết lương ──
            const detailData = {
                payrollId, employeeId: employee.id,
                workingDays,
                baseSalary        : salary.baseSalary,
                overtimePay       : parseFloat(overtimePay.toFixed(2)),
                bonus, insuranceDeduction, taxDeduction, netSalary,
                allowanceAmount   : parseFloat(earnedAllowances.toFixed(2)),
                standardDays      : tsStdDays,
                officialDays      : parseFloat(ts.officialDays       || 0),
                probationDays     : parseFloat(ts.probationDays      || 0),
                businessTripDays  : parseFloat(ts.businessTripDays   || 0),
                holidayDays       : parseFloat(ts.holidayDays        || 0),
                benefitLeaveDays  : parseFloat(ts.benefitLeaveDays   || 0),
                annualLeaveDays   : parseFloat(ts.annualLeaveDays    || 0),
                waitingDays       : parseFloat(ts.waitingDays        || 0),
                nightShiftOfficialDays  : parseFloat(ts.nightShiftOfficialDays   || 0),
                nightShiftProbationDays : parseFloat(ts.nightShiftProbationDays  || 0),
                otWeekday         : parseFloat(ts.otWeekday          || 0),
                otWeekdayNight    : parseFloat(ts.otWeekdayNight     || 0),
                otWeekend         : parseFloat(ts.otWeekend          || 0),
                otWeekendNight    : parseFloat(ts.otWeekendNight     || 0),
                otHoliday         : parseFloat(ts.otHoliday          || 0),
                otHolidayNight    : parseFloat(ts.otHolidayNight     || 0),
                totalOtHours      : this._sumOTHours(ts),
                mealCount         : parseFloat(ts.mealCount          || 0),
                // Lương P2 từ employee_salaries
                performanceSalary,
                // % P2.1, % P2.2 từ performance_reviews
                p1p2Percentage    : p21Percent,
                p3Percentage      : p22Percent,
                kpiPercentage     : p21Percent + p22Percent,
                // Lương thực nhận từng khoản
                p1Amount          : earnedP1,
                p21Amount         : earnedP21,
                p22Amount         : earnedP22,
                probationAmount   : probationSalary,
                // Bảo hiểm chi tiết
                socialInsurance, healthInsurance, unemploymentInsurance,
                socialInsurancePercentage      : INSURANCE_RATES.SOCIAL,
                healthInsurancePercentage      : INSURANCE_RATES.HEALTH,
                unemploymentInsurancePercentage: INSURANCE_RATES.UNEMPLOYMENT,
                // Thuế
                taxableIncomePaid : taxableIncome,
                dependentCount,
                familyDeduction,
                // Các khoản nhập tay giữ nguyên từ lần tính trước
                insuranceAdjustment, employeeUnionFee, partyFee,
                taxAdjustment, otherDeduction,
                adjustmentTaxable, adjustmentNonTaxable, otherNonTaxable,
                // Tổng hợp
                totalGrossIncome,
                totalDeduction,
                // Chi phí công ty
                companySocialInsurance    : companySocial,
                companyHealthInsurance    : companyHealth,
                companyUnemploymentInsurance: companyUnemployment,
                unionFee                  : existingDetail?.unionFee ?? companyUnion,
                totalHrCost,
            };

            details.push(
                existingDetail
                    ? await this.payrollDetailRepository.update(existingDetail.id, detailData)
                    : await this.payrollDetailRepository.create(detailData)
            );
        }
        return { calculated: details.length, details };
    }

    /**
     * Bulk upsert payroll details (insert if not exists, update if exists)
     * Dùng khi user nhấn "Lưu tất cả thay đổi" từ bảng thông tin nhập liệu
     *
     * Tự động lấy dữ liệu từ các bảng khác:
     * - employee_salaries: baseSalary, performanceSalary, allowances
     * - performance_reviews: KPI percentages
     * - time_sheets: attendance data (nếu có)
     * Và tự động tính toán: OT pay, insurance, tax, netSalary...
     */
    async upsertDetails(payrollId, details) {
        const payroll = await this._findPayrollOrFail(payrollId);
        if (payroll.payrollStatus === PAYROLL_STATUS.LOCKED) {
            throw new BadRequestException(AppMessages.Errors.Payroll.IS_LOCKED);
        }

        if (!details || details.length === 0) {
            throw new BadRequestException('Không có dữ liệu để lưu');
        }

        // Lấy các detail hiện có
        const existingDetails = await this.payrollDetailRepository.findByPayroll(payrollId);
        const existingMap = new Map(existingDetails.map(d => [d.employeeId, d]));

        // ── Lấy dữ liệu cần thiết cho tất cả employees ──
        const { payrollMonth, payrollYear } = payroll;
        const empIds = details.map(d => d.employeeId);

        // Lấy employee salaries (baseSalary, allowances, etc.)
        const salaryRepo = AppDataSource.getRepository(EmployeeSalaryEntity);
        const allSalaries = await salaryRepo.find({
            where: { employeeId: In(empIds), isDeleted: false },
            order: { createdAt: 'DESC' },
        });
        const salaryMap = new Map();
        const preferred = ['ACTIVE', 'APPROVED', 'ACTIVE_MEMBER'];
        for (const empId of empIds) {
            const empSalaries = allSalaries.filter(s => s.employeeId === empId);
            salaryMap.set(empId, empSalaries.find(s => preferred.includes(String(s.salaryStatus || '').trim().toUpperCase())) || empSalaries[0]);
        }

        // Lấy performance reviews (KPI scores)
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
        const perfMap = new Map(perfReviews.map(p => [p.employeeId, p]));

        // Lấy timesheets (attendance data)
        const timesheetRepo = AppDataSource.getRepository(TimeSheetEntity);
        const timesheets = await timesheetRepo.find({
            where: { month: payrollMonth, year: payrollYear, employeeId: In(empIds), isDeleted: false },
        });
        const tsMap = new Map(timesheets.map(t => [t.employeeId, t]));

        // Lấy OT rules
        const { activeRules, ruleDepts } = await this._getOTRules();

        // Tính số ngày công chuẩn cho payroll
        const startDate = new Date(payrollYear, payrollMonth - 1, 1);
        const endDate = new Date(payrollYear, payrollMonth, 0, 23, 59, 59);
        const holidayDates = await this._getHolidayDates(startDate, endDate);
        const standardDaysMonth = this._countWorkingDays(payrollYear, payrollMonth, holidayDates) || 22;

        const results = { inserted: 0, updated: 0, errors: [] };

        for (const item of details) {
            try {
                if (!item.employeeId) {
                    results.errors.push({ employeeId: item.employeeId, error: 'Thiếu employeeId' });
                    continue;
                }

                const existing = existingMap.get(item.employeeId);

                // ── Lấy dữ liệu từ các bảng liên quan ──
                const salary = salaryMap.get(item.employeeId);
                const perf = perfMap.get(item.employeeId);
                const ts = tsMap.get(item.employeeId);

                // Lấy employee info để biết departmentId và employmentStatus
                const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
                const employee = await employeeRepo.findOne({
                    where: { id: item.employeeId, isDeleted: false },
                    relations: ['department'],
                });
                if (!employee) {
                    results.errors.push({ employeeId: item.employeeId, error: 'Không tìm thấy nhân viên' });
                    continue;
                }

                // ── Chuẩn bị dữ liệu attendance (parse từ format Việt Nam nếu cần) ──
                const standardDays = _parseNumber(item.standardDays) || _parseNumber(ts?.standardDays) || standardDaysMonth;
                const officialDays = _parseNumber(item.officialDays) || _parseNumber(ts?.officialDays) || 0;
                const probationDays = _parseNumber(item.probationDays) || _parseNumber(ts?.probationDays) || 0;
                const businessTripDays = _parseNumber(item.businessTripDays) || _parseNumber(ts?.businessTripDays) || 0;
                const holidayDays = _parseNumber(item.holidayDays) || _parseNumber(ts?.holidayDays) || 0;
                const benefitLeaveDays = _parseNumber(item.benefitLeaveDays) || _parseNumber(ts?.benefitLeaveDays) || 0;
                const annualLeaveDays = _parseNumber(item.annualLeaveDays) || _parseNumber(ts?.annualLeaveDays) || 0;
                const unpaidLeaveDays = _parseNumber(item.unpaidLeaveDays) || _parseNumber(ts?.unpaidLeaveDays) || 0;
                const nightShiftOfficialDays = _parseNumber(item.nightShiftOfficialDays) || _parseNumber(ts?.nightShiftOfficialDays) || 0;
                const nightShiftProbationDays = _parseNumber(item.nightShiftProbationDays) || _parseNumber(ts?.nightShiftProbationDays) || 0;
                const waitingDays = _parseNumber(item.waitingDays) || _parseNumber(ts?.waitingDays) || 0;
                const mealCount = Math.round(_parseNumber(item.mealCount) || _parseNumber(ts?.mealCount) || 0);
                const usedLeaveDays = _parseNumber(item.usedLeaveDays) || _parseNumber(ts?.usedLeaveDays) || 0;
                const remainingLeaveDays = _parseNumber(item.remainingLeaveDays) || _parseNumber(ts?.remainingLeaveDays) || 0;

                // OT hours từ frontend
                const otWeekday = _parseNumber(item.otWeekday);
                const otWeekdayNight = _parseNumber(item.otWeekdayNight);
                const otWeekend = _parseNumber(item.otWeekend);
                const otWeekendNight = _parseNumber(item.otWeekendNight);
                const otHoliday = _parseNumber(item.otHoliday);
                const otHolidayNight = _parseNumber(item.otHolidayNight);
                const totalOtHours = otWeekday + otWeekdayNight + otWeekend + otWeekendNight + otHoliday + otHolidayNight;

                // Tính workingDays từ các ngày công (đảm bảo là số sạch)
                const workingDays = _parseNumber(officialDays) + _parseNumber(probationDays) + _parseNumber(businessTripDays)
                    + _parseNumber(holidayDays) + _parseNumber(benefitLeaveDays) + _parseNumber(annualLeaveDays);

                // ── Lấy lương và phụ cấp từ employee_salaries ──
                const baseSalary = _parseNumber(salary?.baseSalary || item.baseSalary);
                const performanceSalary = _parseNumber(salary?.performanceSalary || item.performanceSalary);

                // Allowances từ salary
                const lunchAllowance = _parseNumber(salary?.lunchAllowance);
                const fuelAllowance = _parseNumber(salary?.fuelAllowance);
                const phoneAllowance = _parseNumber(salary?.phoneAllowance);
                const otherAllowance = _parseNumber(salary?.otherAllowance);
                const allowanceAmount = lunchAllowance + fuelAllowance + phoneAllowance + otherAllowance;

                // ── Tính KPI percentages từ performance_reviews ──
                let p21Percent = 0;
                let p22Percent = 0;
                if (perf) {
                    const sumScore11to15 =
                        _parseNumber(perf.scoreCompliance) +
                        _parseNumber(perf.scoreAttitude) +
                        _parseNumber(perf.scoreLearning) +
                        _parseNumber(perf.scoreTeamwork) +
                        _parseNumber(perf.scoreSkills);
                    p21Percent = (sumScore11to15 / 5) * 50; // max 50%
                    p22Percent = (_parseNumber(perf.scoreResult) / 5) * 50; // max 50%
                }
                const kpiPercentage = p21Percent + p22Percent;

                // ── Tính lương OT ──
                const tsForOT = { otWeekday, otWeekdayNight, otWeekend, otWeekendNight, otHoliday, otHolidayNight };
                const overtimePay = baseSalary > 0
                    ? this._calcOvertimePay(tsForOT, baseSalary, standardDays, employee.departmentId, activeRules, ruleDepts)
                    : 0;

                // ── Tính lương thực nhận P1, P2.1, P2.2, TV ──
                const tsForCalc = {
                    officialDays, probationDays, businessTripDays, holidayDays,
                    benefitLeaveDays, annualLeaveDays, otWeekday, otWeekdayNight,
                    otWeekend, otWeekendNight, otHoliday, otHolidayNight,
                };
                const { earnedP1, earnedP21, earnedP22, probationSalary } = this._calcEarnedSalaries(
                    { baseSalary, performanceSalary },
                    tsForCalc, standardDays, workingDays, p21Percent, p22Percent,
                    employee.employmentStatus
                );

                // ── Các khoản nhập tay từ frontend (parse từ format Việt Nam) ──
                const bonus = _parseNumber(item.bonus);
                const penalty = _parseNumber(item.penalty);
                const otherDeduction = _parseNumber(item.deduction || item.otherDeduction);
                const unionFeeInput = _parseNumber(item.unionFee);
                const insuranceAdjustment = _parseNumber(item.insuranceAdjustment);
                const employeeUnionFee = _parseNumber(item.employeeUnionFee);
                const partyFee = _parseNumber(item.partyFee);
                const taxAdjustment = _parseNumber(item.taxAdjustment);
                const adjustmentTaxable = _parseNumber(item.adjustmentTaxable);
                const adjustmentNonTaxable = _parseNumber(item.adjustmentNonTaxable);
                const otherNonTaxable = _parseNumber(item.otherNonTaxable);
                const dependentCount = Math.round(_parseNumber(item.dependentCount));

                // ── Tính tổng thu nhập (51) ──
                const totalGrossIncome = this._calcTotalGrossIncome({
                    earnedP1, earnedP21, earnedP22, probationSalary,
                    bonus, allowanceAmount, overtimePay,
                    adjustmentTaxable, adjustmentNonTaxable, otherNonTaxable,
                });

                // ── Tính bảo hiểm ──
                const socialInsurancePercentage = _parseNumber(item.socialInsurancePercentage) || 8;
                const healthInsurancePercentage = _parseNumber(item.healthInsurancePercentage) || 1.5;
                const unemploymentInsurancePercentage = _parseNumber(item.unemploymentInsurancePercentage) || 1;

                const insuranceBase = this._calcInsuranceBase(totalGrossIncome);
                const socialInsurance = parseFloat((insuranceBase * socialInsurancePercentage / 100).toFixed(2));
                const healthInsurance = parseFloat((insuranceBase * healthInsurancePercentage / 100).toFixed(2));
                const unemploymentInsurance = parseFloat((insuranceBase * unemploymentInsurancePercentage / 100).toFixed(2));
                const insuranceDeduction = socialInsurance + healthInsurance + unemploymentInsurance;

                // ── Giảm trừ gia cảnh & thuế ──
                const familyDeduction = this._calcFamilyDeduction(dependentCount);
                const taxableIncome = this._calcTaxableIncome(totalGrossIncome, insuranceDeduction, familyDeduction);
                const taxDeduction = taxableIncome > 0 ? this._calcPIT(taxableIncome) : 0;

                // ── Tổng khấu trừ & NET ──
                const totalDeduction = this._calcTotalDeduction({
                    insuranceDeduction, insuranceAdjustment, employeeUnionFee,
                    partyFee, taxDeduction, taxAdjustment, otherDeduction,
                });
                const netSalary = this._calcNetSalary(totalGrossIncome, totalDeduction);

                // ── Chi phí công ty ──
                const companyUnion = parseFloat((insuranceBase * 0.02).toFixed(2));
                const companyInsurance = parseFloat((insuranceBase * 0.215).toFixed(2));
                const totalHrCost = this._calcTotalHrCost(totalGrossIncome, companyUnion, companyInsurance);
                const companySocialInsurance = parseFloat((insuranceBase * 0.175).toFixed(2));
                const companyHealthInsurance = parseFloat((insuranceBase * 0.03).toFixed(2));
                const companyUnemploymentInsurance = parseFloat((insuranceBase * 0.01).toFixed(2));
                const unionFee = unionFeeInput > 0 ? unionFeeInput : companyUnion;

                // ── Chuẩn bị data để lưu ──
                const detailData = {
                    // Salary from employee_salaries
                    baseSalary, performanceSalary, allowanceAmount,

                    // Attendance
                    standardDays, workingDays, officialDays, probationDays,
                    businessTripDays, holidayDays, benefitLeaveDays, annualLeaveDays,
                    unpaidLeaveDays, nightShiftOfficialDays, nightShiftProbationDays,
                    waitingDays, mealCount, usedLeaveDays, remainingLeaveDays,

                    // OT
                    otWeekday, otWeekdayNight, otWeekend, otWeekendNight,
                    otHoliday, otHolidayNight, totalOtHours, overtimePay,

                    // Earned salaries
                    p1Amount: earnedP1, p21Amount: earnedP21, p22Amount: earnedP22,
                    probationAmount: probationSalary,
                    p1p2Percentage: p21Percent, p3Percentage: p22Percent, kpiPercentage,

                    // Insurance
                    socialInsurance, healthInsurance, unemploymentInsurance,
                    socialInsurancePercentage, healthInsurancePercentage, unemploymentInsurancePercentage,
                    insuranceDeduction,

                    // Tax
                    taxableIncomePaid: taxableIncome,
                    dependentCount, familyDeduction, taxDeduction,

                    // Manual entries
                    bonus, penalty, otherDeduction,
                    insuranceAdjustment, employeeUnionFee, partyFee, unionFee,
                    taxAdjustment, adjustmentTaxable, adjustmentNonTaxable, otherNonTaxable,

                    // Totals
                    totalGrossIncome, totalDeduction, netSalary,

                    // Company costs
                    companySocialInsurance, companyHealthInsurance, companyUnemploymentInsurance,
                    companyUnionFee: companyUnion, totalHrCost,

                    note: item.note || '',
                };

                if (existing) {
                    // UPDATE - cập nhật record có sẵn
                    await this.payrollDetailRepository.update(existing.id, detailData);
                    results.updated++;
                } else {
                    // INSERT mới
                    await this.payrollDetailRepository.create({
                        payrollId,
                        employeeId: item.employeeId,
                        ...detailData,
                    });
                    results.inserted++;
                }
            } catch (err) {
                console.error(`[upsertDetails] Error for employeeId ${item.employeeId}:`, err);
                results.errors.push({ employeeId: item.employeeId, error: err.message });
            }
        }

        // Trả về danh sách details đã cập nhật
        const updatedDetails = await this.payrollDetailRepository.findByPayroll(payrollId);
        return {
            ...results,
            totalDetails: updatedDetails.length,
            details: updatedDetails,
        };
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
            const dateStr = date.toISOString().split('T')[0];
            // Trừ Thứ Bảy (6), Chủ Nhật (0) và ngày lễ
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateStr)) count++;
        }
        return count;
    }

    /**
     * Tính tổng ngày công (chính thức + thử việc + công tác + lễ + chế độ + phép năm)
     */
    _calcWorkingDays(ts) {
        return (
            parseFloat(ts?.officialDays || 0) +
            parseFloat(ts?.probationDays || 0) +
            parseFloat(ts?.businessTripDays || 0) +
            parseFloat(ts?.holidayDays || 0) +
            parseFloat(ts?.benefitLeaveDays || 0) +
            parseFloat(ts?.annualLeaveDays || 0)
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
        // Ưu tiên lấy từ database rule nếu có
        const rule = activeRules.find(r =>
            r.overtimeType?.code === typeCode &&
            (ruleDepts.filter(rd => rd.overtimeRuleId === r.id).length === 0 ||
                ruleDepts.some(rd => rd.overtimeRuleId === r.id && rd.departmentId === departmentId))
        );
        if (rule) {
            const m = parseFloat(rule.salaryMultiplier || 1.5);
            return isNight ? m + 0.1 : m;
        }

        // Multipliers mặc định - nhất quán với Frontend
        // WEEKDAY: 1.5x (ban ngày), 2.1x (ban đêm: +0.6)
        // WEEKEND: 2.0x (ban ngày), 2.7x (ban đêm: +0.7)
        // HOLIDAY: 3.0x (ban ngày), 3.9x (ban đêm: +0.9)
        if (typeCode === 'WEEKDAY') return isNight ? 2.1 : 1.5;
        if (typeCode === 'WEEKEND') return isNight ? 2.7 : 2.0;
        if (typeCode === 'HOLIDAY') return isNight ? 3.9 : 3.0;
        return 1.5;
    }

    /**
     * Tính lương làm thêm giờ (OT)
     * Công thức: Giờ OT × Lương giờ × Hệ số nhân
     * Lương giờ = Lương cơ bản / (Số ngày công chuẩn × 8)
     */
    _calcOvertimePay(ts, baseSalary, standardDays, departmentId, activeRules, ruleDepts) {
        const hourlyRate = standardDays > 0 ? _parseNumber(baseSalary) / (standardDays * 8) : 0;
        const { otWeekday, otWeekdayNight, otWeekend, otWeekendNight, otHoliday, otHolidayNight } = {
            otWeekday: _parseNumber(ts?.otWeekday),
            otWeekdayNight: _parseNumber(ts?.otWeekdayNight),
            otWeekend: _parseNumber(ts?.otWeekend),
            otWeekendNight: _parseNumber(ts?.otWeekendNight),
            otHoliday: _parseNumber(ts?.otHoliday),
            otHolidayNight: _parseNumber(ts?.otHolidayNight),
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
     * Công thức theo tài liệu:
     * (31) P1 thực nhận  = (baseSalary / NC_chuẩn) × payableDays
     * (32) P2.1 thực nhận = (performanceSalary × %P2.1 / 100 / NC_chuẩn) × payableDays
     * (33) P2.2 thực nhận = (performanceSalary × %P2.2 / 100 / NC_chuẩn) × payableDays
     * (34) TV thực nhận  = (baseSalary / NC_chuẩn) × probationPayDays  ← KHÔNG nhân 0.85
     *
     * payableDays (ngày công tính lương) = 22 + 26 + 26.1 + 27 + 28
     *   = officialDays + annualLeaveDays + benefitLeaveDays + holidayDays + businessTripDays
     *   (chỉ áp dụng cho NV chính thức; NV thử việc = 0)
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

        // (31)(32)(33): Ngày công tính lương = 22 + 26 + 26.1 + 27 + 28
        // annualLeaveDays (26) được tính vào ngày công hưởng lương theo chính sách công ty
        const fullPayDays = isProbation ? 0 : (
            parseFloat(ts?.officialDays    || 0) +   // (22) Công chính thức
            parseFloat(ts?.annualLeaveDays || 0) +   // (26) Nghỉ phép năm
            parseFloat(ts?.benefitLeaveDays|| 0) +   // (26.1) Nghỉ chế độ (ốm, thai sản...)
            parseFloat(ts?.holidayDays     || 0) +   // (27) Lễ/Tết
            parseFloat(ts?.businessTripDays|| 0)     // (28) Công tác / Học tập
        );

        // (34): Ngày công TV = probationDays + businessTripDays (nếu đang TV)
        const probationPayDays =
            parseFloat(ts?.probationDays    || 0) +  // (23) Công thử việc
            (isProbation ? parseFloat(ts?.businessTripDays || 0) : 0); // (28) nếu TV

        // Hệ số ngày công = ngày thực tế / ngày chuẩn
        const dayFactor = standardDays > 0 ? fullPayDays / standardDays : 0;

        const earnedP1  = p1Amount  * dayFactor;                  // (31)
        const earnedP21 = p21Base   * dayFactor;                  // (32)
        const earnedP22 = p22Base   * dayFactor;                  // (33)
        // (34) Lương TV = baseSalary / NC_chuẩn × công TV — KHÔNG nhân 0.85
        const probationSalary = standardDays > 0
            ? (p1Amount / standardDays) * probationPayDays
            : 0;

        return { earnedP1, earnedP21, earnedP22, probationSalary };
    }

    /**
     * Tính phụ cấp thực nhận
     * Phụ cấp = lunch_allowance + fuel_allowance + phone_allowance + other_allowance
     * Là tổng cố định mỗi tháng, KHÔNG nhân với số công
     */
    _calcTotalAllowances(salary) {
        return (
            parseFloat(salary.lunchAllowance || 0) +
            parseFloat(salary.fuelAllowance || 0) +
            parseFloat(salary.phoneAllowance || 0) +
            parseFloat(salary.otherAllowance || 0)
        );
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

        // ── OT ──
        const { activeRules, ruleDepts } = await this._getOTRules();
        const ts = {
            officialDays, probationDays, businessTripDays, holidayDays, benefitLeaveDays,
            // Đảm bảo annualLeaveDays được truyền vào để _calcEarnedSalaries tính đúng
            annualLeaveDays: parseFloat(dto.annualLeaveDays ?? detail.annualLeaveDays ?? 0),
            otWeekday, otWeekdayNight, otWeekend, otWeekendNight, otHoliday, otHolidayNight,
        };
        const overtimePay = this._calcOvertimePay(
            ts, detail.baseSalary, standardDays,
            detail.employee?.departmentId, activeRules, ruleDepts
        );

        // ── Lương thực nhận (31-34) ──
        const { earnedP1, earnedP21, earnedP22, probationSalary } = this._calcEarnedSalaries(
            { baseSalary: detail.baseSalary, performanceSalary: detail.performanceSalary },
            ts, standardDays, workingDays, p21Percent, p22Percent,
            detail.employee?.employmentStatus
        );

        // ── Phụ cấp (43) ──
        const earnedAllowances = this._calcTotalAllowances({
            lunchAllowance: detail.lunchAllowance,
            fuelAllowance : detail.fuelAllowance,
            phoneAllowance: detail.phoneAllowance,
            otherAllowance: detail.otherAllowance,
        });

        // ── Các khoản nhập tay ──
        const bonus                = parseFloat(dto.bonus                ?? detail.bonus                ?? 0); // (36.1)
        const insuranceAdjustment  = parseFloat(dto.insuranceAdjustment  ?? detail.insuranceAdjustment  ?? 0); // (53)
        const employeeUnionFee     = parseFloat(dto.employeeUnionFee     ?? detail.employeeUnionFee     ?? 0); // (54)
        const partyFee             = parseFloat(dto.partyFee             ?? detail.partyFee             ?? 0); // (55)
        const taxAdjustment        = parseFloat(dto.taxAdjustment        ?? detail.taxAdjustment        ?? 0); // (64)
        const otherDeduction       = parseFloat(dto.otherDeduction       ?? detail.otherDeduction       ?? 0); // (65)
        const adjustmentTaxable    = parseFloat(dto.adjustmentTaxable    ?? detail.adjustmentTaxable    ?? 0); // (46)
        const adjustmentNonTaxable = parseFloat(dto.adjustmentNonTaxable ?? detail.adjustmentNonTaxable ?? 0); // (47)
        const otherNonTaxable      = parseFloat(dto.otherNonTaxable      ?? detail.otherNonTaxable      ?? 0); // (50.1)

        // ── Tổng thu nhập (51) ──
        const totalGrossIncome = this._calcTotalGrossIncome({
            earnedP1, earnedP21, earnedP22, probationSalary,
            bonus, allowanceAmount: earnedAllowances, overtimePay,
            adjustmentTaxable, adjustmentNonTaxable, otherNonTaxable,
        });

        // ── Bảo hiểm (52) ──
        // Dùng helper để nhất quán với autoCalculate; tỷ lệ có thể override từ dto
        const socialInsurancePercentage      = dto.socialInsurancePercentage      ?? INSURANCE_RATES.SOCIAL;
        const healthInsurancePercentage      = dto.healthInsurancePercentage      ?? INSURANCE_RATES.HEALTH;
        const unemploymentInsurancePercentage= dto.unemploymentInsurancePercentage ?? INSURANCE_RATES.UNEMPLOYMENT;

        const insuranceBase     = this._calcInsuranceBase(totalGrossIncome);
        const socialInsurance   = parseFloat((insuranceBase * socialInsurancePercentage      / 100).toFixed(2));
        const healthInsurance   = parseFloat((insuranceBase * healthInsurancePercentage      / 100).toFixed(2));
        const unemploymentInsurance = parseFloat((insuranceBase * unemploymentInsurancePercentage / 100).toFixed(2));
        const insuranceDeduction = socialInsurance + healthInsurance + unemploymentInsurance; // (52)

        // ── Giảm trừ gia cảnh (12.2) ──
        const dependentCount  = parseInt(dto.dependentCount ?? detail.dependentCount ?? 0);
        const familyDeduction = this._calcFamilyDeduction(dependentCount);

        // ── Thu nhập tính thuế (12.3) & Thuế TNCN (63) ──
        // Thuế được tính lại tự động khi ngày công/lương thay đổi;
        // nếu HR muốn override thủ công, truyền taxDeduction trong dto
        const taxableIncome = this._calcTaxableIncome(totalGrossIncome, insuranceDeduction, familyDeduction);
        const taxDeduction  = dto.taxDeduction !== undefined
            ? parseFloat(dto.taxDeduction)                  // Override thủ công từ HR
            : (taxableIncome > 0 ? this._calcPIT(taxableIncome) : 0); // Tính lại tự động

        // ── Tổng khấu trừ (65.1) & NET (66) ──
        const totalDeduction = this._calcTotalDeduction({
            insuranceDeduction, insuranceAdjustment, employeeUnionFee,
            partyFee, taxDeduction, taxAdjustment, otherDeduction,
        });
        const netSalary = this._calcNetSalary(totalGrossIncome, totalDeduction); // (66)

        // ── Chi phí công ty (79.1) ──
        const companyUnion       = parseFloat((insuranceBase * 0.02).toFixed(2));
        const companyInsurance   = parseFloat((insuranceBase * (0.175 + 0.03 + 0.01)).toFixed(2));
        const totalHrCost        = this._calcTotalHrCost(totalGrossIncome, companyUnion, companyInsurance);

        const unionFeeValue = dto.unionFee !== undefined ? parseFloat(dto.unionFee) : companyUnion;

        return this.payrollDetailRepository.update(detailId, {
            bonus, otherDeduction, insuranceAdjustment, employeeUnionFee, partyFee, taxAdjustment,
            adjustmentTaxable, adjustmentNonTaxable, otherNonTaxable,
            standardDays, workingDays, officialDays, probationDays, businessTripDays, holidayDays,
            benefitLeaveDays, annualLeaveDays: ts.annualLeaveDays,
            otWeekday, otWeekdayNight, otWeekend, otWeekendNight, otHoliday, otHolidayNight, totalOtHours,
            overtimePay       : parseFloat(overtimePay.toFixed(2)),
            p1Amount: earnedP1, p21Amount: earnedP21, p22Amount: earnedP22, probationAmount: probationSalary,
            p1p2Percentage: p21Percent, p3Percentage: p22Percent,
            kpiPercentage : p21Percent + p22Percent,
            performanceSalary : detail.performanceSalary,
            socialInsurance, healthInsurance, unemploymentInsurance,
            socialInsurancePercentage, healthInsurancePercentage, unemploymentInsurancePercentage,
            insuranceDeduction, taxableIncomePaid: taxableIncome,
            dependentCount, familyDeduction,
            taxDeduction, totalGrossIncome, totalDeduction, netSalary,
            unionFee: unionFeeValue,
            totalHrCost,
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
                parseFloat(detail.p1Amount || 0) +
                parseFloat(detail.p21Amount || 0) +
                parseFloat(detail.p22Amount || 0) +
                parseFloat(detail.probationAmount || 0) +
                parseFloat(detail.allowanceAmount || 0) +
                parseFloat(detail.overtimePay || 0) +
                data.bonus -
                data.penalty -
                data.deduction -
                parseFloat(detail.insuranceDeduction || 0) -
                parseFloat(detail.taxDeduction || 0)
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
        const sentAt = new Date();

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
                // Chỉ đánh dấu đã gửi khi email thực sự thành công
                await this.payrollDetailRepository.update(detail.id, { payslipSentAt: sentAt });
                sentCount++;
            } catch (err) {
                console.error(`[PayrollService] Failed to send payslip to ${email}:`, err.message);
            }
        }

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

            // Tính các khoản trừ chi tiết
            // (52) BH NLĐ = 10.5% — dùng giá trị đã lưu (insuranceDeduction = BHXH+BHYT+BHTN)
            const bhNLD         = parseFloat(detail.insuranceDeduction || 0); // (52) 10.5%
            const cdPhiNLD      = parseFloat(detail.employeeUnionFee   || 0); // (54) CĐ phí NLĐ
            const dangPhi       = parseFloat(detail.partyFee            || 0); // (55)
            const truyThuBH     = parseFloat(detail.insuranceAdjustment|| 0); // (53)
            const thueTNCN      = parseFloat(detail.taxDeduction        || 0); // (63)
            const truyThuThue   = parseFloat(detail.taxAdjustment       || 0); // (64)
            const khauTruKhac   = parseFloat(detail.otherDeduction      || 0); // (65)
            // (65.1) Tổng khấu trừ = (52)+(53)+(54)+(55)+(63)+(64)+(65)
            const totalDeductions = bhNLD + truyThuBH + cdPhiNLD + dangPhi + thueTNCN + truyThuThue + khauTruKhac;

            // Chi tiết lương — sử dụng totalGrossIncome đã lưu (51) thay vì tính ngược từ net+deductions
            const grossIncome = parseFloat(detail.totalGrossIncome || 0)
                || (
                    parseFloat(detail.p1Amount      || 0) + parseFloat(detail.p21Amount    || 0) +
                    parseFloat(detail.p22Amount     || 0) + parseFloat(detail.probationAmount|| 0) +
                    parseFloat(detail.allowanceAmount|| 0) + parseFloat(detail.overtimePay || 0) +
                    parseFloat(detail.bonus         || 0)
                );
            const rows = [
                ['THU NHẬP', '', ''],
                ['Ngày công chuẩn',     '', detail.standardDays  || 0],
                ['Ngày công thực tế',   '', detail.workingDays   || 0],
                ['Lương P1 thực nhận',  '', parseFloat(detail.p1Amount        || 0)],
                ['Lương P2.1 thực nhận', '', parseFloat(detail.p21Amount       || 0)],
                ['Lương P2.2 thực nhận', '', parseFloat(detail.p22Amount       || 0)],
                ['Lương thử việc',       '', parseFloat(detail.probationAmount || 0)],
                ['Phụ cấp',              '', parseFloat(detail.allowanceAmount || 0)],
                ['OT',                   '', parseFloat(detail.overtimePay    || 0)],
                ['Thưởng (P3)',          '', parseFloat(detail.bonus           || 0)],
                // (51) dùng totalGrossIncome đã lưu, không tính ngược từ NET
                ['TỔNG THU NHẬP (51)',    '', grossIncome],
                ['', '', ''],
                ['CÁC KHOẢN TRỪ', '', ''],
                ['BH NLĐ (52 = 10.5%)',   '', -bhNLD],
                ['Truy thu BH (53)',      '', -truyThuBH],
                ['CĐ phí NLĐ (54)',       '', -cdPhiNLD],
                ['Đảng phí (55)',         '', -dangPhi],
                ['Thuế TNCN (63)',        '', -thueTNCN],
                ['Truy thu thuế (64)',    '', -truyThuThue],
                ['Trừ khác (65)',         '', -khauTruKhac],
                ['TỔNG KHẤU TRỪ (65.1)',  '', -totalDeductions],
                ['', '', ''],
                ['THỰC LĨNH NET (66)',     '', parseFloat(detail.netSalary || 0)],
            ];

            rows.forEach((row, idx) => {
                const wsRow = ws.getRow(4 + idx);
                wsRow.getCell(1).value = row[0];
                wsRow.getCell(2).value = row[1];
                wsRow.getCell(4).value = row[2];
                const isHeader = row[0] === 'THU NHẬP' || row[0] === 'CÁC KHOẢN TRỪ';
                const isTotal = row[0]?.startsWith('TỔNG') || row[0] === 'THỰC LĨNH (NET)';
                wsRow.getCell(1).font = { bold: isHeader || isTotal };
                wsRow.getCell(2).font = { bold: isHeader || isTotal };
                wsRow.getCell(4).font = { bold: isHeader || isTotal };
                if (isTotal) {
                    wsRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
                    wsRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
                    wsRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
                }
                [1, 2, 4].forEach(col => {
                    wsRow.getCell(col).border = {
                        top: { style: 'thin' }, left: { style: 'thin' },
                        bottom: { style: 'thin' }, right: { style: 'thin' }
                    };
                });
            });

            ws.columns = [
                { width: 25 }, { width: 12 }, { width: 5 }, { width: 18 }
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
        if (isNaN(id)) throw new NotFoundException(AppMessages.Errors.Payroll.NOT_FOUND);
        const payroll = await this.payrollRepository.findById(id);
        if (!payroll) throw new NotFoundException(AppMessages.Errors.Payroll.NOT_FOUND);
        return payroll;
    }

    // ═══════════════════════════════════════════════════════════════
    // PURE CALCULATION HELPERS — Mỗi hàm tương ứng một chỉ tiêu tài liệu
    // ═══════════════════════════════════════════════════════════════

    /**
     * Tính mức lương đóng bảo hiểm (giới hạn trần theo quy định)
     *
     * Trần mức đóng = 20 × mức lương cơ sở (2.340.000 VND) = 46.800.000 VND
     * (theo NĐ 24/2023/NĐ-CP về mức lương cơ sở)
     *
     * @param {number} baseSalary - Lương cơ bản đóng BHXH (chỉ tiêu 1.1)
     * @returns {number} Mức lương đóng BH (đã giới hạn trần)
     */
    _calcInsuranceBase(baseSalary) {
        const SALARY_BASE_CEILING = 20 * 2_340_000; // 46.800.000 VND
        return Math.min(parseFloat(baseSalary || 0), SALARY_BASE_CEILING);
    }

    /**
     * Tính BHXH + BHYT + BHTN phía người lao động đóng (chỉ tiêu 52)
     *
     * (52) = 10.5% × mức đóng BH
     *   - BHXH:  8%   (Luật BHXH 2014)
     *   - BHYT:  1.5% (Luật BHYT)
     *   - BHTN:  1%   (Luật Việc làm)
     *   Tổng NLĐ: 10.5%
     *
     * @param {number} insuranceBase - Mức lương đóng BH (đã giới hạn trần)
     * @returns {{ total, social, health, unemployment }} Kết quả từng loại và tổng
     */
    _calcEmployeeInsurance(insuranceBase) {
        const social       = parseFloat((insuranceBase * INSURANCE_RATES.SOCIAL       / 100).toFixed(2));
        const health       = parseFloat((insuranceBase * INSURANCE_RATES.HEALTH       / 100).toFixed(2));
        const unemployment = parseFloat((insuranceBase * INSURANCE_RATES.UNEMPLOYMENT / 100).toFixed(2));
        return {
            social,
            health,
            unemployment,
            total: social + health + unemployment, // = 10.5% × insuranceBase
        };
    }

    /**
     * Tính giảm trừ gia cảnh (chỉ tiêu 12.2)
     *
     * (12.2) = 15.500.000 + số NPT × 4.400.000
     *   - 15.500.000: giảm trừ bản thân (theo quy định mới)
     *   - 4.400.000: giảm trừ mỗi người phụ thuộc
     *
     * @param {number} dependentCount - Số người phụ thuộc đã đăng ký
     * @returns {number} Tổng khoản giảm trừ gia cảnh
     */
    _calcFamilyDeduction(dependentCount = 0) {
        const SELF_DEDUCTION      = 15_500_000; // Giảm trừ bản thân (quy định mới)
        const DEPENDENT_DEDUCTION =  4_400_000; // Giảm trừ mỗi NPT
        return (Math.max(0, parseInt(dependentCount) || 0) * DEPENDENT_DEDUCTION) + SELF_DEDUCTION;
    }

    /**
     * Tính tổng thu nhập gộp (chỉ tiêu 51)
     *
     * (51) = (36) + (36.1) + (43) + (45) + (46) + (47) + (50.1)
     *   - (36)   = (31)+(32)+(33)+(34): Tổng lương chính
     *   - (36.1): Thưởng phát sinh P3
     *   - (43)  : Phụ cấp thực nhận (ăn trưa, xăng, ĐT...)
     *   - (45)  : Tăng ca OT
     *   - (46)  : Truy thu/lĩnh tính thuế
     *   - (47)  : Truy thu/lĩnh không tính thuế
     *   - (50.1): Thu nhập khác không tính thuế
     *
     * @param {Object} c - Các thành phần thu nhập
     * @returns {number} Tổng thu nhập (51)
     */
    _calcTotalGrossIncome(c) {
        const totalOfficialSalary =
            (c.earnedP1        || 0) +  // (31) P1 thực nhận
            (c.earnedP21       || 0) +  // (32) P2.1 thực nhận
            (c.earnedP22       || 0) +  // (33) P2.2 thực nhận
            (c.probationSalary || 0);   // (34) TV thực nhận
        return parseFloat((
            totalOfficialSalary       +  // (36)   Tổng lương chính
            (c.bonus           || 0)  +  // (36.1) Thưởng P3
            (c.allowanceAmount || 0)  +  // (43)   Phụ cấp
            (c.overtimePay     || 0)  +  // (45)   OT
            (c.adjustmentTaxable    || 0) + // (46) Truy thu tính thuế
            (c.adjustmentNonTaxable || 0) + // (47) Truy thu không thuế
            (c.otherNonTaxable      || 0)   // (50.1) Khác không thuế
        ).toFixed(2));
    }

    /**
     * Tính thu nhập tính thuế TNCN (chỉ tiêu 12.3)
     *
     * (12.3) = (51) - (52) - (12.2) + (46)
     *   - (51)  : Tổng thu nhập
     *   - (52)  : BH NLĐ đóng (10.5%)
     *   - (12.2): Giảm trừ gia cảnh (bản thân + NPT)
     *   - (46)  : Truy thu tính thuế (đã cộng vào gross nhưng cần điều chỉnh riêng)
     * Kết quả không âm (nếu âm → 0)
     *
     * @param {number} totalGrossIncome   - (51)
     * @param {number} insuranceDeduction - (52)
     * @param {number} familyDeduction    - (12.2)
     * @returns {number} Thu nhập tính thuế (12.3), không âm
     */
    _calcTaxableIncome(totalGrossIncome, insuranceDeduction, familyDeduction) {
        return Math.max(0, totalGrossIncome - insuranceDeduction - familyDeduction);
    }

    /**
     * Tính tổng các khoản khấu trừ (chỉ tiêu 65.1)
     *
     * (65.1) = (52) + (53) + (54) + (55) + (63) + (64) + (65)
     *   - (52): BHXH+BHYT+BHTN NLĐ (10.5%)
     *   - (53): Truy thu bảo hiểm
     *   - (54): Công đoàn phí NLĐ (1% - nếu có)
     *   - (55): Đảng phí
     *   - (63): Thuế TNCN
     *   - (64): Truy thu thuế TNCN
     *   - (65): Trừ khác (phạt, khấu trừ...)
     *
     * @param {Object} c - Các khoản khấu trừ
     * @returns {number} Tổng khấu trừ (65.1)
     */
    _calcTotalDeduction(c) {
        return parseFloat((
            (c.insuranceDeduction  || 0) +  // (52) BH NLĐ
            (c.insuranceAdjustment || 0) +  // (53) Truy thu BH
            (c.employeeUnionFee   || 0)  +  // (54) CĐ phí NLĐ
            (c.partyFee           || 0)  +  // (55) Đảng phí
            (c.taxDeduction       || 0)  +  // (63) Thuế TNCN
            (c.taxAdjustment      || 0)  +  // (64) Truy thu thuế
            (c.otherDeduction     || 0)     // (65) Trừ khác
        ).toFixed(2));
    }

    /**
     * Tính lương thực nhận NET (chỉ tiêu 66)
     *
     * (66) = (51) - (65.1)
     *
     * @param {number} totalGrossIncome - (51)
     * @param {number} totalDeduction   - (65.1)
     * @returns {number} Lương thực nhận
     */
    _calcNetSalary(totalGrossIncome, totalDeduction) {
        return parseFloat((totalGrossIncome - totalDeduction).toFixed(2));
    }

    /**
     * Tính tổng chi phí nhân sự phía doanh nghiệp (chỉ tiêu 79.1)
     *
     * (79.1) = (51) + (71) + (75)
     *   - (51): Tổng thu nhập NLĐ
     *   - (71): KPCĐ công ty (2% lương đóng BH)
     *   - (75): BH phía công ty (BHXH 17.5% + BHYT 3% + BHTN 1% = 21.5%)
     * Lưu ý: Dùng tổng thu nhập (51), KHÔNG dùng lương thực nhận (66)
     *
     * @param {number} totalGrossIncome  - (51)
     * @param {number} companyUnionFee   - (71)
     * @param {number} companyInsurance  - (75) BHXH+BHYT+BHTN công ty
     * @returns {number} Tổng chi phí nhân sự (79.1)
     */
    _calcTotalHrCost(totalGrossIncome, companyUnionFee, companyInsurance) {
        return parseFloat((totalGrossIncome + companyUnionFee + companyInsurance).toFixed(2));
    }

    /**
     * Tính thuế TNCN theo biểu thuế lũy tiến từng phần (chỉ tiêu 63)
     *
     * Bậc thuế (Phụ lục I, TT 111/2013/TT-BTC):
     * - Đến 5 triệu:          5%
     * - Trên 5 → 10 triệu:  10%
     * - Trên 10 → 18 triệu: 15%
     * - Trên 18 → 32 triệu: 20%
     * - Trên 32 → 52 triệu: 25%
     * - Trên 52 → 80 triệu: 30%
     * - Trên 80 triệu:       35%
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
     * Tạo HTML cho phiếu lương email - Full 36 KPI indicators
     */
    _buildPayslipHtml(detail, payroll) {
        const emp = detail.employee;
        const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(parseFloat(n || 0)));
        const f = (n) => parseFloat(n || 0);
        const sentDate = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

        // ── I. Định mức Hợp đồng & Công (1-5) — Hiển thị định mức gốc, không phải lương thực nhận ──
        // (1.1) Lương đóng BHXH — lấy từ baseSalary (nguồn: hợp đồng lao động)
        const lươngĐóngBHXH = f(detail.baseSalary);
        // (11) Lương vị trí P1 — ưu tiên positionSalary nếu đã có, fallback = baseSalary
        const lươngVịTrí = f(detail.positionSalary) || f(detail.baseSalary);
        // (12) Thưởng HQCV P2.1 — ưu tiên performanceBonusSalary nếu đã có, fallback = p21Amount
        const thưởngHQCV = f(detail.performanceBonusSalary) || f(detail.p21Amount) || 0;
        // (13) Khoán CV P2.2 — ưu tiên taskContractSalary nếu đã có, fallback = p22Amount
        const khoánCV = f(detail.taskContractSalary) || f(detail.p22Amount) || 0;
        // (14) Lương TV — ưu tiên probationBaseSalary nếu đã có, fallback = probationAmount
        const lươngThửViệc = f(detail.probationBaseSalary) || f(detail.probationAmount) || 0;

        // ── II. Dữ liệu công chốt (6-9) ──
        const côngChuẩn = f(detail.standardDays) || 26;
        const côngChínhThức = f(detail.officialDays);
        const côngThửViệc = f(detail.probationDays);
        const côngKhác = f(detail.benefitLeaveDays) + f(detail.holidayDays) + f(detail.businessTripDays) + f(detail.annualLeaveDays);

        // ── III. Thu nhập thực nhận (10-15) ──
        const p21Percent = f(detail.p1p2Percentage);
        const p22Percent = f(detail.p3Percentage);
        const kpiPercent = p21Percent + p22Percent;
        const p1ThựcNhận = f(detail.p1Amount);
        const p21Thực = f(detail.p21Amount);
        const p22Thực = f(detail.p22Amount);
        const pTVThực = f(detail.probationAmount);
        const tổngLươngChính = p1ThựcNhận + p21Thực + p22Thực + pTVThực;

        // ── IV. Thu nhập khác & Phụ cấp (16-21) ──
        const thưởngP3 = f(detail.bonus);
        const phụCấp = f(detail.allowanceAmount);
        const tăngCaOT = f(detail.overtimePay);
        const truyThuTínhThuế = f(detail.otherTaxableIncome) || 0;
        const truyThuKoThuế = f(detail.otherNonTaxableIncome) || 0;
        const khácKoThuế = f(detail.adjustmentNonTaxable) || 0;

        // ── V. Tổng thu nhập (22) ──
        const tổngThuNhập = tổngLươngChính + thưởngP3 + phụCấp + tăngCaOT + truyThuTínhThuế + truyThuKoThuế + khácKoThuế;

        // ── VI. Khấu trừ & Thuế (23-32) ──
        // (52) BHXH+BHYT+BHTN NLĐ = 10.5% × mức đóng BH
        // Ưu tiên dùng giá trị đã lưu (insuranceDeduction = 10.5%), tính lại nếu chưa có
        const insuranceBase = this._calcInsuranceBase(lươngĐóngBHXH);
        const bhxhNLĐ = f(detail.insuranceDeduction) || parseFloat((insuranceBase * 0.105).toFixed(2)); // (52) = 10.5%
        const partyFee = f(detail.partyFee) || 0;                    // (55) Đảng phí
        const insuranceAdjustment = f(detail.insuranceAdjustment) || 0; // (53) Truy thu BH
        const employeeUnionFee = f(detail.employeeUnionFee) || 0;    // (54) CĐ phí NLĐ
        const taxAdjustment = f(detail.taxAdjustment) || 0;          // (64) Truy thu thuế
        // (12.2) Giảm trừ gia cảnh = NPT × 4.4tr + 11tr
        const giảmTrừGiaCảnh = f(detail.familyDeduction) || this._calcFamilyDeduction(f(detail.dependentCount));
        // (12.3) Thu nhập tính thuế
        const tnTínhThuế = f(detail.taxableIncomePaid) || Math.max(0, tổngThuNhập - bhxhNLĐ - giảmTrừGiaCảnh);
        const thuếTNCN = f(detail.taxDeduction);                    // (63)
        const khấuTrừKhác = f(detail.otherDeduction) || 0;        // (65) Trừ khác
        // (65.1) Tổng khấu trừ = (52)+(53)+(54)+(55)+(63)+(64)+(65)
        const tổngKhấuTrừ = bhxhNLĐ + insuranceAdjustment + employeeUnionFee + partyFee + thuếTNCN + taxAdjustment + khấuTrừKhác;

        // ── VII. Thực lĩnh (66) ──
        // Ưu tiên dùng giá trị đã lưu (netSalary), tính ngược nếu chưa có
        const thựcLĩnh = f(detail.netSalary) || (tổngThuNhập - tổngKhấuTrừ);

        // ── VIII. Chi phí Doanh nghiệp (79.1) ──
        // (79.1) = (51) + (71) + (75) — dùng tổngThuNhập (51), KHÔNG dùng thựcLĩnh (66)
        const kpcđCty = f(detail.unionFee) || parseFloat((insuranceBase * 0.02).toFixed(2));       // (71) KPCĐ công ty 2%
        const bhxhCty = f(detail.companyInsurance)
            || parseFloat((insuranceBase * (0.175 + 0.03 + 0.01)).toFixed(2));                       // (75) BH công ty 21.5%
        const tổngChiPhíNS = f(detail.totalHrCost)
            || this._calcTotalHrCost(tổngThuNhập, kpcđCty, bhxhCty);                              // (79.1)

        // Styles
        const sectionTitle = 'font-size:10px;font-weight:800;letter-spacing:1.5px;color:#64748b;text-transform:uppercase;margin:0 0 8px;';
        const tableStyle = 'width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);';
        const thStyle = 'padding:6px 10px;text-align:center;font-weight:700;font-size:9px;';
        const tdLabel = 'padding:5px 10px;font-size:11px;color:#475569;';
        const tdValue = 'padding:5px 10px;text-align:right;font-weight:600;font-size:11px;color:#1e293b;';
        const tdValueRed = 'padding:5px 10px;text-align:right;font-weight:600;font-size:11px;color:#dc2626;';

        const section = (title, bgColor, content) => `
        <tr>
            <td style="padding:16px 24px 0;">
                <p style="${sectionTitle}">${title}</p>
                <table style="${tableStyle}">
                    <thead>
                        <tr style="background:${bgColor};color:#fff;">
                            <th style="${thStyle}">Chỉ tiêu</th>
                            <th style="${thStyle}">Giá trị</th>
                        </tr>
                    </thead>
                    <tbody>${content}</tbody>
                </table>
            </td>
        </tr>`;

        const row = (label, value, isRed = false, isBold = false) => `
            <tr style="border-bottom:1px solid #f1f5f9;${isBold ? 'background:#f8fafc;' : ''}">
                <td style="${tdLabel}${isBold ? 'font-weight:700;' : ''}">${label}</td>
                <td style="${isRed ? tdValueRed : tdValue}${isBold ? 'font-weight:700;' : ''}">${isRed ? '−' : ''}${fmt(value)} ${isRed ? '₫' : ''}</td>
            </tr>`;

        const subtotalRow = (label, value, bgColor, textColor) => `
            <tr style="background:${bgColor};">
                <td style="padding:6px 10px;font-weight:800;font-size:12px;color:${textColor};">${label}</td>
                <td style="padding:6px 10px;text-align:right;font-weight:800;font-size:13px;color:${textColor};">${fmt(value)} ₫</td>
            </tr>`;

        const html = `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Phiếu Lương Chi Tiết Tháng ${payroll.payrollMonth}/${payroll.payrollYear}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 16px;">
<tr><td align="center">
<table width="700" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);max-width:700px;width:100%;">

  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);padding:28px 28px 20px;">
      <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,0.7);text-transform:uppercase;">SmartHR System</p>
      <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">PHIẾU LƯƠNG CHI TIẾT</h1>
      <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">Tháng ${payroll.payrollMonth}/${payroll.payrollYear} &nbsp;|&nbsp; Ngày gửi: ${sentDate}</p>
    </td>
  </tr>

  <!-- Employee Info -->
  <tr>
    <td style="padding:16px 24px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:44px;">
            <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#1d4ed8);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:white;text-align:center;line-height:42px;">
              ${(emp?.fullName || 'N')[0].toUpperCase()}
            </div>
          </td>
          <td style="padding-left:12px;">
            <p style="margin:0;font-size:15px;font-weight:800;color:#1e293b;">${emp?.fullName || '—'}</p>
            <p style="margin:3px 0 0;font-size:11px;color:#64748b;">
              <span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:20px;font-weight:700;margin-right:8px;">${emp?.employeeCode || '—'}</span>
              ${emp?.position?.positionName || ''} &nbsp;|&nbsp; ${emp?.department?.departmentName || ''}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- I. Định mức Hợp đồng & Công (1-5) -->
  ${section('I. Định mức Hợp đồng & Công', '#fef3c7', `
    ${row('1.1 Lương đóng BHXH', lươngĐóngBHXH)}
    ${row('11 Lương vị trí (P2)', lươngVịTrí)}
    ${row('12 Thưởng hiệu quả công việc (P2.1)', thưởngHQCV)}
    ${row('13 Khoán công việc (P2.2)', khoánCV)}
    ${row('14 Lương thử việc', lươngThửViệc)}
  `)}

  <!-- II. Dữ liệu công chốt (6-9) -->
  ${section('II. Dữ liệu Công Chốt', '#f0fdf4', `
    ${row('Công chuẩn tháng', côngChuẩn)}
    ${row('22 Công chính thức', côngChínhThức)}
    ${row('23 Công thử việc', côngThửViệc)}
    ${row('26+ Công khác (phép, lễ, công tác)', côngKhác)}
  `)}

  <!-- III. Thu nhập thực nhận (10-15) -->
  ${section('III. Thu nhập Thực nhận', '#dbeafe', `
    ${row('10 % KPI (P2.1 + P2.2)', kpiPercent)}
    ${row('31 Lương P1 thực nhận', p1ThựcNhận)}
    ${row('32 Thưởng P2.1 thực', p21Thực)}
    ${row('33 Khoán P2.2 thực', p22Thực)}
    ${row('34 Thử việc thực', pTVThực)}
    ${subtotalRow('36 Tổng lương chính', tổngLươngChính, '#eff6ff', '#1e40af')}
  `)}

  <!-- IV. Thu nhập khác & Phụ cấp (16-21) -->
  ${section('IV. Thu nhập Khác & Phụ cấp', '#ede9fe', `
    ${row('36.1 Thưởng P3', thưởngP3)}
    ${row('43 Phụ cấp (ăn trưa, xăng, điện thoại...)', phụCấp)}
    ${row('45 Tăng ca OT', tăngCaOT)}
    ${row('46 Truy thu tính thuế', truyThuTínhThuế)}
    ${row('47 Truy thu không thuế', truyThuKoThuế)}
    ${row('50.1 Khác không thuế', khácKoThuế)}
  `)}

  <!-- V. Tổng thu nhập (22) -->
  <tr>
    <td style="padding:16px 24px 0;">
      <table style="${tableStyle}">
        <tbody>
          ${subtotalRow('51 TỔNG THU NHẬP', tổngThuNhập, '#dcfce7', '#166534')}
        </tbody>
      </table>
    </td>
  </tr>

  <!-- VI. Khấu trừ & Thuế (23-32) -->
  ${section('V. Khấu trừ & Thuế', '#ffe4e6', `
    ${row('52 BHXH người lao động (8%)', bhxhNLĐ, true)}
    ${row('53 Truy thu BH', insuranceAdjustment, true)}
    ${row('55 Đảng phí', partyFee, true)}
    ${row('12.2 Giảm trừ gia cảnh', giảmTrừGiaCảnh)}
    ${row('12.3 Thu nhập tính thuế', tnTínhThuế)}
    ${row('63 Thuế TNCN', thuếTNCN, true)}
    ${row('64 Truy thu thuế', taxAdjustment, true)}
    ${row('65 Trừ khác (phạt, khấu trừ...)', khấuTrừKhác, true)}
    ${subtotalRow('65.1 Tổng khấu trừ', tổngKhấuTrừ, '#fef2f2', '#991b1b')}
  `)}

  <!-- VII. Thực lĩnh (33) -->
  <tr>
    <td style="padding:20px 24px 0;">
      <table style="${tableStyle}">
        <tbody>
          <tr style="background:linear-gradient(135deg,#166534,#15803d);">
            <td style="padding:14px 16px;font-size:14px;font-weight:800;color:#ffffff;">66 LƯƠNG THỰC NHẬN (NET)</td>
            <td style="padding:14px 16px;text-align:right;font-size:18px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">${fmt(thựcLĩnh)} ₫</td>
          </tr>
        </tbody>
      </table>
    </td>
  </tr>

  <!-- VIII. Chi phí Doanh nghiệp (34-36) -->
  ${section('VI. Chi phí Doanh nghiệp', '#f1f5f9', `
    ${row('71 KPCĐ công ty (2%)', kpcđCty)}
    ${row('75 BHXH công ty (17.5%)', bhxhCty)}
    ${subtotalRow('79.1 TỔNG CHI PHÍ NHÂN SỰ', tổngChiPhíNS, '#e2e8f0', '#334155')}
  `)}

  <!-- Note -->
  ${detail.note ? `
  <tr>
    <td style="padding:16px 24px 0;">
      <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;">
        <p style="margin:0;font-size:11px;color:#92400e;"><strong>Ghi chú:</strong> ${detail.note}</p>
      </div>
    </td>
  </tr>` : ''}

  <!-- Footer -->
  <tr>
    <td style="padding:20px 24px 24px;border-top:1px solid #f1f5f9;">
      <p style="margin:0;font-size:10px;color:#94a3b8;text-align:center;line-height:1.6;">
        Đây là phiếu lương điện tử được tạo tự động bởi hệ thống <strong style="color:#3b82f6;">SmartHR</strong>.<br/>
        Vui lòng liên hệ phòng Nhân sự nếu có thắc mắc về lương tháng này.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

        return html;
    }

    // ═══════════════════════════════════════════════════════════════
    // FILE ĐÍNH KÈM (PAYROLL ATTACHMENTS)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Lấy danh sách file đính kèm của bảng lương
     */
    async getAttachments(payrollId) {
        await this._findPayrollOrFail(payrollId);
        return this.attachmentRepository.findByPayroll(payrollId);
    }

    /**
     * Upload một hoặc nhiều file đính kèm vào bảng lương.
     * @param {number} payrollId
     * @param {Express.Multer.File[]} files  - Mảng file từ multer
     * @param {{ id: number, fullName: string }} uploader
     */
    async uploadAttachments(payrollId, files, uploader) {
        const payroll = await this._findPayrollOrFail(payrollId);

        if (!files || files.length === 0) {
            throw new BadRequestException('Không có file nào được tải lên.');
        }

        const saved = [];
        for (const file of files) {
            const record = await this.attachmentRepository.create({
                payrollId,
                fileName: file.originalname,
                filePath: file.path.replace(/\\/g, '/'), // normalize path
                fileSize: file.size,
                mimeType: file.mimetype,
                uploadedBy: uploader?.id || null,
                uploadedByName: uploader?.fullName || null,
            });
            saved.push(record);
        }

        return saved;
    }

    /**
     * Xóa một file đính kèm (soft delete + xóa file vật lý).
     * Không cho phép xóa nếu bảng lương đã LOCKED.
     */
    async deleteAttachment(payrollId, attachmentId) {
        const payroll = await this._findPayrollOrFail(payrollId);

        if (payroll.payrollStatus === PAYROLL_STATUS.LOCKED) {
            throw new BadRequestException('Không thể xóa file đính kèm khi bảng lương đã bị khóa.');
        }

        const attachment = await this.attachmentRepository.findById(attachmentId);
        if (!attachment || attachment.payrollId !== payrollId) {
            throw new NotFoundException('Không tìm thấy file đính kèm.');
        }

        // Xóa file vật lý trên disk (bỏ qua lỗi nếu file không tồn tại)
        try {
            if (fs.existsSync(attachment.filePath)) {
                fs.unlinkSync(attachment.filePath);
            }
        } catch (err) {
            console.warn(`[PayrollService] Không thể xóa file vật lý ${attachment.filePath}:`, err.message);
        }

        // Soft delete trong DB
        await this.attachmentRepository.softDelete(attachmentId);
        return { deleted: true, fileName: attachment.fileName };
    }

    /**
     * Trả về thông tin file để download.
     * @returns {{ filePath: string, fileName: string, mimeType: string }}
     */
    async getAttachmentForDownload(payrollId, attachmentId) {
        await this._findPayrollOrFail(payrollId);

        const attachment = await this.attachmentRepository.findById(attachmentId);
        if (!attachment || attachment.payrollId !== payrollId) {
            throw new NotFoundException('Không tìm thấy file đính kèm.');
        }

        const absolutePath = path.resolve(attachment.filePath);
        if (!fs.existsSync(absolutePath)) {
            throw new NotFoundException('File vật lý không tồn tại trên server. Vui lòng liên hệ quản trị.');
        }

        return {
            absolutePath,
            fileName: attachment.fileName,
            mimeType: attachment.mimeType || 'application/octet-stream',
            fileSize: attachment.fileSize,
        };
    }
}
