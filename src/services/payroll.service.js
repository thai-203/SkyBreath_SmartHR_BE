import { AppMessages } from '../common/constants/index.js';
import { NotFoundException, ConflictException, BadRequestException } from '../common/exceptions/index.js';
import { AppDataSource } from '../database/data-source.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { EmployeeSalaryEntity } from '../models/entities/employee-salary.entity.js';
import { TimeSheetEntity } from '../models/entities/time-sheet.entity.js';
import { OvertimeRuleEntity } from '../models/entities/overtime-rule.entity.js';
import { ExcelUtil } from '../common/utils/excel.util.js';
import sendMail from '../common/utils/mail.util.js';

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
        const { payrollMonth, payrollYear } = dto;

        const existing = await this.payrollRepository.findByPeriod(payrollMonth, payrollYear);
        if (existing) {
            throw new ConflictException(AppMessages.Errors.Payroll.ALREADY_EXISTS);
        }

        return this.payrollRepository.create({
            payrollMonth,
            payrollYear,
            payrollStatus: PAYROLL_STATUS.DRAFT,
        });
    }

    async autoCalculate(payrollId) {
        const payroll = await this._findPayrollOrFail(payrollId);

        if (payroll.payrollStatus === PAYROLL_STATUS.LOCKED) {
            throw new BadRequestException(AppMessages.Errors.Payroll.IS_LOCKED);
        }

        const { payrollMonth, payrollYear } = payroll;

        // 1. Get all active employees
        const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
        const employees = await employeeRepo.find({
            where: [
                { employmentStatus: 'ACTIVE', isDeleted: false },
                { employmentStatus: 'PROBATION', isDeleted: false },
            ],
            relations: ['department'],
        });

        if (employees.length === 0) {
            return { calculated: 0, details: [] };
        }

        // 2. Load overtime rule (use first available)
        const overtimeRuleRepo = AppDataSource.getRepository(OvertimeRuleEntity);
        const overtimeRule = await overtimeRuleRepo.findOne({ where: { isDeleted: false } });
        const otRateWeekday = overtimeRule?.overtimeRateWeekday || 1.5;
        const otRateWeekend = overtimeRule?.overtimeRateWeekend || 2.0;

        // 3. For each employee: load salary + timesheet, compute payroll detail
        const details = [];
        for (const employee of employees) {
            // Get current active salary
            const salaryRepo = AppDataSource.getRepository(EmployeeSalaryEntity);
            const salary = await salaryRepo.findOne({
                where: {
                    employeeId: employee.id,
                    salaryStatus: 'ACTIVE',
                    isDeleted: false,
                },
                order: { effectiveFrom: 'DESC' },
            });

            if (!salary) continue; // Skip employees without salary config

            // Get timesheet for the period
            const tsRepo = AppDataSource.getRepository(TimeSheetEntity);
            const timesheet = await tsRepo.findOne({
                where: {
                    employeeId: employee.id,
                    month: payrollMonth,
                    year: payrollYear,
                    isDeleted: false,
                },
            });

            // Compute base salary (pro-rated if working days < standard 26 days)
            const standardDays = 26;
            const workingDays = timesheet ? parseFloat(timesheet.totalWorkingDays) || 0 : 0;
            const overtimeHours = timesheet ? parseFloat(timesheet.overtimeHours) || 0 : 0;

            const totalBaseSalary = parseFloat(salary.baseSalary) || 0;
            const allowances = (
                parseFloat(salary.lunchAllowance || 0) +
                parseFloat(salary.fuelAllowance || 0) +
                parseFloat(salary.phoneAllowance || 0) +
                parseFloat(salary.otherAllowance || 0) +
                parseFloat(salary.performanceSalary || 0)
            );

            // Pro-rate base salary by actual working days
            const dailyRate = totalBaseSalary / standardDays;
            const earnedBaseSalary = parseFloat((dailyRate * workingDays).toFixed(2));

            // Overtime pay: hourly rate * OT hours * rate multiplier
            const hourlyRate = totalBaseSalary / standardDays / 8;
            const overtimePay = parseFloat((hourlyRate * overtimeHours * otRateWeekday).toFixed(2));

            // Insurance deductions (applied on base salary only)
            const insuranceBase = Math.min(totalBaseSalary, 20 * 2_340_000); // cap at 20x regional min wage
            const insuranceDeduction = parseFloat((
                insuranceBase * (SOCIAL_INSURANCE_RATE + HEALTH_INSURANCE_RATE + UNEMPLOYMENT_RATE)
            ).toFixed(2));

            // PIT (simplified personal income tax)
            const taxableIncome = earnedBaseSalary + allowances + overtimePay - insuranceDeduction - PIT_PERSONAL_DEDUCTION;
            const taxDeduction = taxableIncome > 0
                ? parseFloat(this._calcPIT(taxableIncome).toFixed(2))
                : 0;

            const netSalary = parseFloat((
                earnedBaseSalary + allowances + overtimePay - insuranceDeduction - taxDeduction
            ).toFixed(2));

            // Upsert detail
            const existingDetail = await this.payrollDetailRepository.findByPayrollAndEmployee(
                payrollId, employee.id
            );

            const detailData = {
                payrollId,
                employeeId: employee.id,
                workingDays,
                baseSalary: earnedBaseSalary,
                overtimePay,
                bonus: existingDetail?.bonus || 0,
                penalty: existingDetail?.penalty || 0,
                deduction: existingDetail?.deduction || 0,
                insuranceDeduction,
                taxDeduction,
                netSalary: parseFloat((netSalary + parseFloat(existingDetail?.bonus || 0) - parseFloat(existingDetail?.penalty || 0) - parseFloat(existingDetail?.deduction || 0)).toFixed(2)),
                note: existingDetail?.note || null,
            };

            let detail;
            if (existingDetail) {
                detail = await this.payrollDetailRepository.update(existingDetail.id, detailData);
            } else {
                detail = await this.payrollDetailRepository.create(detailData);
            }
            details.push(detail);
        }

        return { calculated: details.length, details };
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

        const netSalary = parseFloat((
            parseFloat(detail.baseSalary) +
            parseFloat(detail.overtimePay) +
            bonus -
            deduction -
            penalty -
            parseFloat(detail.insuranceDeduction) -
            parseFloat(detail.taxDeduction)
        ).toFixed(2));

        return this.payrollDetailRepository.update(detailId, {
            bonus,
            deduction,
            penalty,
            netSalary,
            note: dto.note !== undefined ? dto.note : detail.note,
        });
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
            workingDays: d.workingDays || 0,
            baseSalary: parseFloat(d.baseSalary || 0),
            overtimePay: parseFloat(d.overtimePay || 0),
            bonus: parseFloat(d.bonus || 0),
            deduction: parseFloat(d.deduction || 0),
            penalty: parseFloat(d.penalty || 0),
            insuranceDeduction: parseFloat(d.insuranceDeduction || 0),
            taxDeduction: parseFloat(d.taxDeduction || 0),
            netSalary: parseFloat(d.netSalary || 0),
            payslipSent: d.payslipSentAt ? 'Đã gửi' : 'Chưa gửi',
        }));

        const columns = [
            { header: 'STT', key: 'index', width: 6 },
            { header: 'Mã NV', key: 'employeeCode', width: 12 },
            { header: 'Họ và tên', key: 'fullName', width: 25 },
            { header: 'Phòng ban', key: 'department', width: 20 },
            { header: 'Chức vụ', key: 'position', width: 18 },
            { header: 'Ngày công', key: 'workingDays', width: 10 },
            { header: 'Lương cơ bản', key: 'baseSalary', width: 15 },
            { header: 'Phụ cấp OT', key: 'overtimePay', width: 14 },
            { header: 'Thưởng', key: 'bonus', width: 14 },
            { header: 'Khấu trừ', key: 'deduction', width: 14 },
            { header: 'Phạt', key: 'penalty', width: 12 },
            { header: 'BHXH/YT/TN', key: 'insuranceDeduction', width: 16 },
            { header: 'Thuế TNCN', key: 'taxDeduction', width: 14 },
            { header: 'Thực nhận', key: 'netSalary', width: 16 },
            { header: 'Phiếu lương', key: 'payslipSent', width: 14 },
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
                ['Lương cơ bản', parseFloat(detail.baseSalary || 0)],
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
                <tr><td style="padding:8px;border:1px solid #e5e7eb;">Lương cơ bản</td><td style="text-align:right;padding:8px;border:1px solid #e5e7eb;">${fmt(detail.baseSalary)} ₫</td></tr>
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
