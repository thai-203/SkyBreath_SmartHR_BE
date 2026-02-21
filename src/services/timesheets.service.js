import { AppMessages } from '../common/constants/index.js';
import { NotFoundException, ConflictException, BadRequestException } from '../common/exceptions/index.js';
import { AppDataSource } from '../database/data-source.js';
import { AttendanceRecordEntity } from '../models/entities/attendance-record.entity.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { HolidayListEntity } from '../models/entities/holiday-list.entity.js';
import { ShiftAssignmentEntity } from '../models/entities/shift-assignment.entity.js';
import { WorkingShiftEntity } from '../models/entities/working-shift.entity.js';
import { ExcelUtil } from '../common/utils/excel.util.js';
import { Between } from 'typeorm';

export class TimesheetsService {
    constructor(timesheetsRepository) {
        this.timesheetsRepository = timesheetsRepository;
    }

    // ──────────────────────────────────────
    // UC24 - Monthly Timesheet Generation
    // ──────────────────────────────────────

    async generate(generateDto) {
        const { month, year, departmentId } = generateDto;

        // Get month boundaries
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        // 1. Get active employees
        const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
        const employeeQuery = employeeRepo.createQueryBuilder('employee')
            .where('employee.isDeleted = :isDeleted', { isDeleted: false })
            .andWhere('employee.employmentStatus IN (:...statuses)', {
                statuses: ['ACTIVE', 'PROBATION'],
            });

        if (departmentId) {
            employeeQuery.andWhere('employee.departmentId = :departmentId', { departmentId });
        }

        const employees = await employeeQuery.getMany();

        if (employees.length === 0) {
            return { generated: 0, timesheets: [] };
        }

        // 2. Get holidays for this month
        const holidayRepo = AppDataSource.getRepository(HolidayListEntity);
        const holidays = await holidayRepo.find({
            where: {
                holidayDate: Between(
                    startDate.toISOString().split('T')[0],
                    endDate.toISOString().split('T')[0]
                ),
                isDeleted: false,
            },
        });
        const holidayDates = new Set(holidays.map(h => {
            const d = new Date(h.holidayDate);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }));

        // 3. Calculate standard working days (weekdays minus holidays)
        const standardWorkingDays = this._countWorkingDays(year, month, holidayDates);

        // 4. Get attendance records for all employees this month
        const attendanceRepo = AppDataSource.getRepository(AttendanceRecordEntity);
        const allAttendance = await attendanceRepo.createQueryBuilder('att')
            .where('att.isDeleted = :isDeleted', { isDeleted: false })
            .andWhere('att.checkInTime >= :start', { start: startDate })
            .andWhere('att.checkInTime <= :end', { end: endDate })
            .getMany();

        // Group attendance by employeeId
        const attendanceMap = new Map();
        allAttendance.forEach(record => {
            if (!attendanceMap.has(record.employeeId)) {
                attendanceMap.set(record.employeeId, []);
            }
            attendanceMap.get(record.employeeId).push(record);
        });

        // 5. Get default shift for OT calculation
        const defaultShift = await this._getDefaultShift();
        const shiftHoursPerDay = defaultShift
            ? this._calcShiftHours(defaultShift)
            : 8;

        // 6. Generate/update timesheets
        const results = [];
        for (const employee of employees) {
            const records = attendanceMap.get(employee.id) || [];

            // Calculate totals
            const workedDates = new Set();
            let totalWorkingHours = 0;
            let overtimeHours = 0;

            records.forEach(record => {
                if (record.checkInTime && record.checkOutTime) {
                    const checkIn = new Date(record.checkInTime);
                    const checkOut = new Date(record.checkOutTime);
                    const dateKey = `${checkIn.getFullYear()}-${String(checkIn.getMonth() + 1).padStart(2, '0')}-${String(checkIn.getDate()).padStart(2, '0')}`;
                    workedDates.add(dateKey);

                    const hoursWorked = (checkOut - checkIn) / (1000 * 60 * 60);
                    totalWorkingHours += hoursWorked;

                    // OT = hours beyond standard shift per day
                    if (hoursWorked > shiftHoursPerDay) {
                        overtimeHours += hoursWorked - shiftHoursPerDay;
                    }
                }
            });

            const totalWorkingDays = workedDates.size;

            // Upsert
            const existing = await this.timesheetsRepository.findByEmployeeAndPeriod(
                employee.id, month, year
            );

            let timesheet;
            if (existing) {
                timesheet = await this.timesheetsRepository.update(existing.id, {
                    totalWorkingDays: parseFloat(totalWorkingDays.toFixed(2)),
                    totalWorkingHours: parseFloat(totalWorkingHours.toFixed(2)),
                    overtimeHours: parseFloat(overtimeHours.toFixed(2)),
                    isLocked: false,
                });
            } else {
                timesheet = await this.timesheetsRepository.create({
                    employeeId: employee.id,
                    month,
                    year,
                    totalWorkingDays: parseFloat(totalWorkingDays.toFixed(2)),
                    totalWorkingHours: parseFloat(totalWorkingHours.toFixed(2)),
                    overtimeHours: parseFloat(overtimeHours.toFixed(2)),
                    isLocked: false,
                });
            }
            results.push(timesheet);
        }

        return {
            generated: results.length,
            standardWorkingDays,
            timesheets: results,
        };
    }

    async findAll(queryDto) {
        const result = await this.timesheetsRepository.findAll(queryDto);
        return {
            ...result,
            page: queryDto.page,
            limit: queryDto.limit,
            totalPages: Math.ceil(result.total / queryDto.limit),
        };
    }

    async findById(id) {
        const timesheet = await this.timesheetsRepository.findById(id);
        if (!timesheet) {
            throw new NotFoundException(AppMessages.Errors.Timesheet.NOT_FOUND);
        }
        return timesheet;
    }

    async getAttendanceDetails(timesheetId) {
        const timesheet = await this.findById(timesheetId);

        const startDate = new Date(timesheet.year, timesheet.month - 1, 1);
        const endDate = new Date(timesheet.year, timesheet.month, 0, 23, 59, 59);

        // Get attendance records for this employee + month
        const attendanceRepo = AppDataSource.getRepository(AttendanceRecordEntity);
        const records = await attendanceRepo.createQueryBuilder('att')
            .where('att.employeeId = :employeeId', { employeeId: timesheet.employeeId })
            .andWhere('att.isDeleted = :isDeleted', { isDeleted: false })
            .andWhere('att.checkInTime >= :start', { start: startDate })
            .andWhere('att.checkInTime <= :end', { end: endDate })
            .orderBy('att.checkInTime', 'ASC')
            .getMany();

        // Get employee's shift assignment
        const shift = await this._getEmployeeShift(timesheet.employeeId, timesheet.month, timesheet.year);

        // Get holidays
        const holidayRepo = AppDataSource.getRepository(HolidayListEntity);
        const holidays = await holidayRepo.find({
            where: {
                holidayDate: Between(
                    startDate.toISOString().split('T')[0],
                    endDate.toISOString().split('T')[0]
                ),
                isDeleted: false,
            },
        });
        const holidayDates = new Set(holidays.map(h => {
            const d = new Date(h.holidayDate);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }));

        // Build daily detail with on-the-fly computation
        const dailyDetails = this._buildDailyDetails(
            records, shift, timesheet.year, timesheet.month, holidayDates
        );

        return {
            timesheet,
            dailyDetails,
            summary: {
                totalDays: dailyDetails.length,
                presentDays: dailyDetails.filter(d => d.status === 'PRESENT').length,
                absentDays: dailyDetails.filter(d => d.status === 'ABSENT').length,
                lateDays: dailyDetails.filter(d => d.lateMinutes > 0).length,
                earlyLeaveDays: dailyDetails.filter(d => d.earlyLeaveMinutes > 0).length,
                holidayDays: dailyDetails.filter(d => d.status === 'HOLIDAY').length,
                weekendDays: dailyDetails.filter(d => d.status === 'WEEKEND').length,
            },
        };
    }

    // ──────────────────────────────────────
    // UC25 - Timesheet Data Management
    // ──────────────────────────────────────

    async recalculate(id) {
        const timesheet = await this.findById(id);
        if (timesheet.isLocked) {
            throw new BadRequestException(AppMessages.Errors.Timesheet.IS_LOCKED);
        }

        const startDate = new Date(timesheet.year, timesheet.month - 1, 1);
        const endDate = new Date(timesheet.year, timesheet.month, 0, 23, 59, 59);

        const attendanceRepo = AppDataSource.getRepository(AttendanceRecordEntity);
        const records = await attendanceRepo.createQueryBuilder('att')
            .where('att.employeeId = :employeeId', { employeeId: timesheet.employeeId })
            .andWhere('att.isDeleted = :isDeleted', { isDeleted: false })
            .andWhere('att.checkInTime >= :start', { start: startDate })
            .andWhere('att.checkInTime <= :end', { end: endDate })
            .getMany();

        const defaultShift = await this._getDefaultShift();
        const shiftHoursPerDay = defaultShift ? this._calcShiftHours(defaultShift) : 8;

        const workedDates = new Set();
        let totalWorkingHours = 0;
        let overtimeHours = 0;

        records.forEach(record => {
            if (record.checkInTime && record.checkOutTime) {
                const checkIn = new Date(record.checkInTime);
                const checkOut = new Date(record.checkOutTime);
                const dateKey = `${checkIn.getFullYear()}-${String(checkIn.getMonth() + 1).padStart(2, '0')}-${String(checkIn.getDate()).padStart(2, '0')}`;
                workedDates.add(dateKey);

                const hoursWorked = (checkOut - checkIn) / (1000 * 60 * 60);
                totalWorkingHours += hoursWorked;

                if (hoursWorked > shiftHoursPerDay) {
                    overtimeHours += hoursWorked - shiftHoursPerDay;
                }
            }
        });

        return this.timesheetsRepository.update(id, {
            totalWorkingDays: parseFloat(workedDates.size.toFixed(2)),
            totalWorkingHours: parseFloat(totalWorkingHours.toFixed(2)),
            overtimeHours: parseFloat(overtimeHours.toFixed(2)),
        });
    }

    async update(id, updateDto) {
        const timesheet = await this.findById(id);
        if (timesheet.isLocked) {
            throw new BadRequestException(AppMessages.Errors.Timesheet.IS_LOCKED);
        }
        return this.timesheetsRepository.update(id, updateDto);
    }

    // ──────────────────────────────────────
    // UC26 - Timesheet Locking
    // ──────────────────────────────────────

    async lock(id) {
        const timesheet = await this.findById(id);
        if (timesheet.isLocked) {
            throw new BadRequestException(AppMessages.Errors.Timesheet.ALREADY_LOCKED);
        }
        return this.timesheetsRepository.update(id, { isLocked: true });
    }

    async unlock(id) {
        const timesheet = await this.findById(id);
        if (!timesheet.isLocked) {
            throw new BadRequestException(AppMessages.Errors.Timesheet.NOT_LOCKED);
        }
        return this.timesheetsRepository.update(id, { isLocked: false });
    }

    // ──────────────────────────────────────
    // UC27 - Export & Reporting
    // ──────────────────────────────────────

    async exportSummary(month, year, departmentId) {
        const { items } = await this.timesheetsRepository.findAll({
            month,
            year,
            departmentId,
            take: 10000,
            skip: 0,
        });

        const data = items.map((ts, index) => ({
            index: index + 1,
            employeeCode: ts.employee?.employeeCode || '',
            fullName: ts.employee?.fullName || '',
            department: ts.employee?.department?.departmentName || '',
            position: ts.employee?.position?.positionName || '',
            totalWorkingDays: ts.totalWorkingDays || 0,
            totalWorkingHours: ts.totalWorkingHours || 0,
            overtimeHours: ts.overtimeHours || 0,
            status: ts.isLocked ? 'Đã khóa' : 'Mở',
        }));

        const columns = [
            { header: 'STT', key: 'index', width: 8 },
            { header: 'Mã NV', key: 'employeeCode', width: 15 },
            { header: 'Họ và tên', key: 'fullName', width: 25 },
            { header: 'Phòng ban', key: 'department', width: 20 },
            { header: 'Chức vụ', key: 'position', width: 20 },
            { header: 'Ngày công', key: 'totalWorkingDays', width: 12 },
            { header: 'Giờ công', key: 'totalWorkingHours', width: 12 },
            { header: 'Giờ OT', key: 'overtimeHours', width: 12 },
            { header: 'Trạng thái', key: 'status', width: 12 },
        ];

        return ExcelUtil.export(data, columns, `Bang cham cong T${month}-${year}`);
    }

    async exportDetailed(month, year, employeeId) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const attendanceRepo = AppDataSource.getRepository(AttendanceRecordEntity);
        const query = attendanceRepo.createQueryBuilder('att')
            .leftJoinAndSelect('att.employee', 'employee')
            .leftJoinAndSelect('employee.department', 'department')
            .where('att.isDeleted = :isDeleted', { isDeleted: false })
            .andWhere('att.checkInTime >= :start', { start: startDate })
            .andWhere('att.checkInTime <= :end', { end: endDate });

        if (employeeId) {
            query.andWhere('att.employeeId = :employeeId', { employeeId });
        }

        const records = await query
            .orderBy('employee.fullName', 'ASC')
            .addOrderBy('att.checkInTime', 'ASC')
            .getMany();

        // Group records by employee
        const employeeMap = new Map();
        records.forEach(r => {
            const empId = r.employeeId;
            if (!employeeMap.has(empId)) {
                employeeMap.set(empId, {
                    employee: r.employee,
                    records: [],
                });
            }
            employeeMap.get(empId).records.push(r);
        });

        // Build multi-sheet Excel workbook
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.default.Workbook();

        const columns = [
            { header: 'STT', key: 'index', width: 8 },
            { header: 'Ngày', key: 'date', width: 15 },
            { header: 'Thứ', key: 'dayOfWeek', width: 8 },
            { header: 'Giờ vào', key: 'checkIn', width: 12 },
            { header: 'Giờ ra', key: 'checkOut', width: 12 },
            { header: 'Số giờ', key: 'hoursWorked', width: 10 },
            { header: 'Trạng thái', key: 'attendanceStatus', width: 15 },
            { header: 'Loại', key: 'attendanceType', width: 15 },
        ];

        const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

        for (const [, { employee: emp, records: empRecords }] of employeeMap) {
            // Sheet name: employee code or name (max 31 chars, no special chars)
            const sheetName = (emp.employeeCode || emp.fullName || `NV${emp.id}`)
                .replace(/[*?:\\/\[\]]/g, '')
                .substring(0, 31);

            const worksheet = workbook.addWorksheet(sheetName);

            // Employee info header
            worksheet.mergeCells('A1:H1');
            const titleCell = worksheet.getCell('A1');
            titleCell.value = `Chi tiết chấm công - ${emp.fullName || ''} (${emp.employeeCode || ''})`;
            titleCell.font = { bold: true, size: 14 };
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.getRow(1).height = 30;

            worksheet.mergeCells('A2:H2');
            const periodCell = worksheet.getCell('A2');
            periodCell.value = `Kỳ: Tháng ${month}/${year} | Phòng ban: ${emp.department?.departmentName || '-'}`;
            periodCell.font = { size: 11, italic: true };
            periodCell.alignment = { horizontal: 'center' };

            // Column headers at row 4
            worksheet.columns = columns.map(col => ({
                key: col.key,
                width: col.width,
            }));

            const headerRow = worksheet.getRow(4);
            columns.forEach((col, i) => {
                const cell = headerRow.getCell(i + 1);
                cell.value = col.header;
                cell.font = { bold: true, size: 11, color: { argb: '000000' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' },
                };
            });
            headerRow.height = 25;

            // Data rows starting at row 5
            empRecords.forEach((r, idx) => {
                const checkIn = r.checkInTime ? new Date(r.checkInTime) : null;
                const checkOut = r.checkOutTime ? new Date(r.checkOutTime) : null;
                const hoursWorked = (checkIn && checkOut)
                    ? ((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(2)
                    : 0;

                const row = worksheet.getRow(5 + idx);
                const values = [
                    idx + 1,
                    checkIn ? checkIn.toLocaleDateString('vi-VN') : '',
                    checkIn ? dayNames[checkIn.getDay()] : '',
                    checkIn ? checkIn.toLocaleTimeString('vi-VN') : '',
                    checkOut ? checkOut.toLocaleTimeString('vi-VN') : '',
                    hoursWorked,
                    r.attendanceStatus || '',
                    r.attendanceType || '',
                ];
                values.forEach((val, i) => {
                    const cell = row.getCell(i + 1);
                    cell.value = val;
                    cell.border = {
                        top: { style: 'thin' }, left: { style: 'thin' },
                        bottom: { style: 'thin' }, right: { style: 'thin' },
                    };
                    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
                });
            });

            // Summary row
            const summaryRowIdx = 5 + empRecords.length + 1;
            const summaryRow = worksheet.getRow(summaryRowIdx);
            summaryRow.getCell(1).value = 'Tổng cộng:';
            summaryRow.getCell(1).font = { bold: true };
            summaryRow.getCell(6).value = empRecords.reduce((sum, r) => {
                if (r.checkInTime && r.checkOutTime) {
                    return sum + (new Date(r.checkOutTime) - new Date(r.checkInTime)) / (1000 * 60 * 60);
                }
                return sum;
            }, 0).toFixed(2);
            summaryRow.getCell(6).font = { bold: true };
        }

        return await workbook.xlsx.writeBuffer();
    }

    // ──────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────

    _countWorkingDays(year, month, holidayDates) {
        const daysInMonth = new Date(year, month, 0).getDate();
        let count = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const dayOfWeek = date.getDay();
            const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            // Skip weekends (0=Sun, 6=Sat) and holidays
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateKey)) {
                count++;
            }
        }
        return count;
    }

    async _getDefaultShift() {
        const shiftRepo = AppDataSource.getRepository(WorkingShiftEntity);
        return shiftRepo.findOne({ where: { isDeleted: false }, order: { id: 'ASC' } });
    }

    async _getEmployeeShift(employeeId, month, year) {
        const assignmentRepo = AppDataSource.getRepository(ShiftAssignmentEntity);
        const assignment = await assignmentRepo.findOne({
            where: { employeeId, isDeleted: false },
            relations: ['shift'],
            order: { effectiveFrom: 'DESC' },
        });

        if (assignment?.shift) return assignment.shift;
        return this._getDefaultShift();
    }

    _calcShiftHours(shift) {
        if (!shift.startTime || !shift.endTime) return 8;

        const start = this._timeToMinutes(shift.startTime);
        const end = this._timeToMinutes(shift.endTime);
        let total = end - start;

        if (shift.breakStartTime && shift.breakEndTime) {
            const breakStart = this._timeToMinutes(shift.breakStartTime);
            const breakEnd = this._timeToMinutes(shift.breakEndTime);
            total -= (breakEnd - breakStart);
        }

        return total / 60;
    }

    _timeToMinutes(timeStr) {
        const parts = String(timeStr).split(':');
        return parseInt(parts[0]) * 60 + parseInt(parts[1] || 0);
    }

    _buildDailyDetails(records, shift, year, month, holidayDates) {
        const daysInMonth = new Date(year, month, 0).getDate();

        // Index records by date
        const recordsByDate = new Map();
        records.forEach(r => {
            if (r.checkInTime) {
                const d = new Date(r.checkInTime);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                if (!recordsByDate.has(key)) {
                    recordsByDate.set(key, []);
                }
                recordsByDate.get(key).push(r);
            }
        });

        const shiftStart = shift ? this._timeToMinutes(shift.startTime) : 8 * 60;
        const shiftEnd = shift ? this._timeToMinutes(shift.endTime) : 17 * 60;
        const shiftHours = shift ? this._calcShiftHours(shift) : 8;

        const details = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const dayOfWeek = date.getDay();
            const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            const detail = {
                date: dateKey,
                dayOfWeek: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][dayOfWeek],
                checkIn: null,
                checkOut: null,
                workingHours: 0,
                lateMinutes: 0,
                earlyLeaveMinutes: 0,
                overtimeHours: 0,
                status: 'ABSENT',
                attendanceStatus: null,
                attendanceType: null,
            };

            if (dayOfWeek === 0 || dayOfWeek === 6) {
                detail.status = 'WEEKEND';
                details.push(detail);
                continue;
            }

            if (holidayDates.has(dateKey)) {
                detail.status = 'HOLIDAY';
                details.push(detail);
                continue;
            }

            const dayRecords = recordsByDate.get(dateKey);
            if (dayRecords && dayRecords.length > 0) {
                // Take earliest check-in and latest check-out
                const checkIn = new Date(Math.min(...dayRecords.map(r => new Date(r.checkInTime).getTime())));
                const checkOut = dayRecords.some(r => r.checkOutTime)
                    ? new Date(Math.max(...dayRecords.filter(r => r.checkOutTime).map(r => new Date(r.checkOutTime).getTime())))
                    : null;

                detail.checkIn = checkIn.toLocaleTimeString('vi-VN');
                detail.checkOut = checkOut ? checkOut.toLocaleTimeString('vi-VN') : null;
                detail.attendanceStatus = dayRecords[0].attendanceStatus;
                detail.attendanceType = dayRecords[0].attendanceType;
                detail.status = 'PRESENT';

                if (checkOut) {
                    const hoursWorked = (checkOut - checkIn) / (1000 * 60 * 60);
                    detail.workingHours = parseFloat(hoursWorked.toFixed(2));

                    if (hoursWorked > shiftHours) {
                        detail.overtimeHours = parseFloat((hoursWorked - shiftHours).toFixed(2));
                    }
                }

                // Late = check-in after shift start
                const checkInMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
                if (checkInMinutes > shiftStart) {
                    detail.lateMinutes = checkInMinutes - shiftStart;
                }

                // Early leave = check-out before shift end
                if (checkOut) {
                    const checkOutMinutes = checkOut.getHours() * 60 + checkOut.getMinutes();
                    if (checkOutMinutes < shiftEnd) {
                        detail.earlyLeaveMinutes = shiftEnd - checkOutMinutes;
                    }
                }
            }

            details.push(detail);
        }

        return details;
    }
}
