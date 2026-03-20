import { AppMessages } from '../common/constants/index.js';
import { NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '../common/exceptions/index.js';
import { AppDataSource } from '../database/data-source.js';
import { AttendanceRecordEntity } from '../models/entities/attendance-record.entity.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { HolidayListEntity } from '../models/entities/holiday-list.entity.js';
import { ShiftAssignmentEntity } from '../models/entities/shift-assignment.entity.js';
import { WorkingShiftEntity } from '../models/entities/working-shift.entity.js';
import { ExcelUtil } from '../common/utils/excel.util.js';
import { Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { RequestEntity } from '../models/entities/request.entity.js';

export class TimesheetsService {
    constructor(timesheetsRepository, actionLogsService) {
        this.timesheetsRepository = timesheetsRepository;
        this.actionLogsService = actionLogsService;
    }

    // ──────────────────────────────────────
    // UC24 - Monthly Timesheet Generation
    // ──────────────────────────────────────

    async generate(generateDto, userContext) {
        const { month, year, departmentId, regenerate = false } = generateDto;

        // Get month boundaries
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        // 1. Get active employees
        const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
        const employeeQuery = employeeRepo.createQueryBuilder('employee')
            .leftJoinAndSelect('employee.department', 'department')
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
            where: [
                {
                    startDate: Between(
                        startDate.toISOString().split('T')[0],
                        endDate.toISOString().split('T')[0]
                    ),
                    isDeleted: false,
                },
                {
                    endDate: Between(
                        startDate.toISOString().split('T')[0],
                        endDate.toISOString().split('T')[0]
                    ),
                    isDeleted: false,
                },
                {
                    startDate: LessThanOrEqual(startDate.toISOString().split('T')[0]),
                    endDate: MoreThanOrEqual(endDate.toISOString().split('T')[0]),
                    isDeleted: false,
                }
            ],
        });
        const holidayDates = new Set();
        holidays.forEach(h => {
            const current = new Date(h.startDate);
            const stop = new Date(h.endDate || h.startDate);
            while (current <= stop) {
                holidayDates.add(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
            }
        });

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

        // 5. Generate/update timesheets (per-employee shift)
        let generatedCount = 0;
        let updatedCount = 0;
        let failedCount = 0;
        const results = [];

        for (const employee of employees) {
            try {
                const records = attendanceMap.get(employee.id) || [];

                // Get this employee's shift (or default)
                const shift = await this._getEmployeeShift(employee.id, month, year);
                const shiftHoursPerDay = shift ? this._calcShiftHours(shift) : 8;

                // Group records by date, taking earliest check-in & latest check-out per day
                const dailyMap = new Map();
                records.forEach(record => {
                    if (record.checkInTime && record.checkOutTime) {
                        const checkIn = new Date(record.checkInTime);
                        const checkOut = new Date(record.checkOutTime);
                        const dateKey = `${checkIn.getFullYear()}-${String(checkIn.getMonth() + 1).padStart(2, '0')}-${String(checkIn.getDate()).padStart(2, '0')}`;

                        if (!dailyMap.has(dateKey)) {
                            dailyMap.set(dateKey, { checkIn, checkOut });
                        } else {
                            const existing = dailyMap.get(dateKey);
                            if (checkIn < existing.checkIn) existing.checkIn = checkIn;
                            if (checkOut > existing.checkOut) existing.checkOut = checkOut;
                        }
                    }
                });

                // Calculate totals with break deduction & half-day support
                let totalWorkingDays = 0;
                let totalWorkingHours = 0;
                let overtimeHours = 0;

                for (const [, { checkIn, checkOut }] of dailyMap) {
                    const actualHours = this._calcActualHours(checkIn, checkOut, shift);
                    totalWorkingHours += actualHours;
                    totalWorkingDays += this._calcWorkingDay(actualHours, shiftHoursPerDay);
                    if (actualHours > shiftHoursPerDay) {
                        overtimeHours += actualHours - shiftHoursPerDay;
                    }
                }

                // Upsert: check for existing timesheet
                const existing = await this.timesheetsRepository.findByEmployeeAndPeriod(
                    employee.id, month, year
                );

                let timesheet;
                if (existing) {
                    if (existing.isLocked && !regenerate) {
                        // Skip locked, not in regenerate mode
                        continue;
                    }
                    timesheet = await this.timesheetsRepository.update(existing.id, {
                        totalWorkingDays: parseFloat(totalWorkingDays.toFixed(2)),
                        totalWorkingHours: parseFloat(totalWorkingHours.toFixed(2)),
                        overtimeHours: parseFloat(overtimeHours.toFixed(2)),
                        isLocked: false,
                    });
                    updatedCount++;
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
                    generatedCount++;
                }
                results.push(timesheet);
            } catch (err) {
                console.error(`[TimesheetsService] generate failed for employee ${employee.id}:`, err.message);
                failedCount++;
            }
        }

        if (this.actionLogsService) {
            await this.actionLogsService.log({
                userId: userContext?.id,
                actionType: 'GENERATE',
                targetTable: 'timesheets',
                description: `Tạo bảng chấm công tháng ${month}/${year}: tạo mới ${generatedCount}, ghi đè ${updatedCount}, thất bại ${failedCount}`,
            });
        }

        return {
            generated: generatedCount,
            updated: updatedCount,
            failed: failedCount,
            standardWorkingDays,
            timesheets: results,
        };
    }

    async addEmployee(addDto) {
        const { employeeId, month, year } = addDto;

        // Check if employee exists and is active
        const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
        const employee = await employeeRepo.findOne({
            where: { id: employeeId, isDeleted: false },
        });
        if (!employee) {
            throw new NotFoundException(AppMessages.Errors.Timesheet.EMPLOYEE_NOT_FOUND);
        }

        // Check if timesheet already exists
        const existing = await this.timesheetsRepository.findByEmployeeAndPeriod(employeeId, month, year);
        if (existing) {
            throw new ConflictException(AppMessages.Errors.Timesheet.ALREADY_EXISTS);
        }

        // Get month boundaries
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        // Get holidays
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
            while (current <= stop) {
                holidayDates.add(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
            }
        });

        // Get attendance records for this employee
        const attendanceRepo = AppDataSource.getRepository(AttendanceRecordEntity);
        const records = await attendanceRepo.createQueryBuilder('att')
            .where('att.employeeId = :employeeId', { employeeId })
            .andWhere('att.isDeleted = :isDeleted', { isDeleted: false })
            .andWhere('att.checkInTime >= :start', { start: startDate })
            .andWhere('att.checkInTime <= :end', { end: endDate })
            .getMany();

        // Calc totals with per-employee shift, break deduction & half-day
        const shift = await this._getEmployeeShift(employeeId, month, year);
        const shiftHoursPerDay = shift ? this._calcShiftHours(shift) : 8;

        // Group records by date
        const dailyMap = new Map();
        records.forEach(record => {
            if (record.checkInTime && record.checkOutTime) {
                const checkIn = new Date(record.checkInTime);
                const checkOut = new Date(record.checkOutTime);
                const dateKey = `${checkIn.getFullYear()}-${String(checkIn.getMonth() + 1).padStart(2, '0')}-${String(checkIn.getDate()).padStart(2, '0')}`;

                if (!dailyMap.has(dateKey)) {
                    dailyMap.set(dateKey, { checkIn, checkOut });
                } else {
                    const existing = dailyMap.get(dateKey);
                    if (checkIn < existing.checkIn) existing.checkIn = checkIn;
                    if (checkOut > existing.checkOut) existing.checkOut = checkOut;
                }
            }
        });

        let totalWorkingDays = 0;
        let totalWorkingHours = 0;
        let overtimeHours = 0;

        for (const [, { checkIn, checkOut }] of dailyMap) {
            const actualHours = this._calcActualHours(checkIn, checkOut, shift);
            totalWorkingHours += actualHours;
            totalWorkingDays += this._calcWorkingDay(actualHours, shiftHoursPerDay);

            if (actualHours > shiftHoursPerDay) {
                overtimeHours += actualHours - shiftHoursPerDay;
            }
        }

        const timesheet = await this.timesheetsRepository.create({
            employeeId,
            month,
            year,
            totalWorkingDays: parseFloat(totalWorkingDays.toFixed(2)),
            totalWorkingHours: parseFloat(totalWorkingHours.toFixed(2)),
            overtimeHours: parseFloat(overtimeHours.toFixed(2)),
            isLocked: false,
        });

        return timesheet;
    }

    async remove(id, userContext) {
        const timesheet = await this.findById(id, userContext);
        if (timesheet.isLocked) {
            throw new BadRequestException(AppMessages.Errors.Timesheet.IS_LOCKED);
        }
        await this.timesheetsRepository.softDelete(id);

        if (this.actionLogsService) {
            await this.actionLogsService.log({
                userId: userContext?.id,
                actionType: 'DELETE',
                targetTable: 'timesheets',
                targetRecordId: id,
                description: `Xóa bảng chấm công tháng ${timesheet.month}/${timesheet.year} của ${timesheet.employee?.fullName || ''} - ${timesheet.employee?.employeeCode || ''}`,
            });
        }

        return { id };
    }

    async findAll(queryDto, userContext) {
        console.log('[TimesheetsService] findAll - userContext:', userContext);
        if (userContext && this._isEmployee(userContext)) {
            const employee = await this._getEmployeeByUserId(userContext.id);
            console.log('[TimesheetsService] findAll - identified employee:', employee?.id);
            if (employee) {
                queryDto.employeeId = employee.id;
            } else {
                console.warn('[TimesheetsService] findAll - employee record NOT FOUND for user:', userContext.id);
                return { items: [], total: 0, page: queryDto.page, limit: queryDto.limit, totalPages: 0 };
            }
        }

        const result = await this.timesheetsRepository.findAll(queryDto);
        return {
            ...result,
            page: queryDto.page,
            limit: queryDto.limit,
            totalPages: Math.ceil(result.total / queryDto.limit),
        };
    }

    async findById(id, userContext) {
        const timesheet = await this.timesheetsRepository.findById(id);
        if (!timesheet) {
            throw new NotFoundException(AppMessages.Errors.Timesheet.NOT_FOUND);
        }

        if (userContext) {
            await this._checkAccess(timesheet, userContext);
        }

        return timesheet;
    }

    async getAttendanceDetails(timesheetId, userContext) {
        const timesheet = await this.findById(timesheetId, userContext);

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
            where: [
                {
                    startDate: Between(
                        startDate.toISOString().split('T')[0],
                        endDate.toISOString().split('T')[0]
                    ),
                    isDeleted: false,
                },
                {
                    endDate: Between(
                        startDate.toISOString().split('T')[0],
                        endDate.toISOString().split('T')[0]
                    ),
                    isDeleted: false,
                },
                {
                    startDate: LessThanOrEqual(startDate.toISOString().split('T')[0]),
                    endDate: MoreThanOrEqual(endDate.toISOString().split('T')[0]),
                    isDeleted: false,
                }
            ],
        });
        const holidayDates = new Set();
        holidays.forEach(h => {
            const current = new Date(h.startDate);
            const stop = new Date(h.endDate || h.startDate);
            while (current <= stop) {
                holidayDates.add(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
            }
        });

        // Get approved leave requests
        const requestRepo = AppDataSource.getRepository(RequestEntity);
        const leaveRequests = await requestRepo.find({
            where: {
                employeeId: timesheet.employeeId,
                requestStatus: 'APPROVED',
                requestType: 'LEAVE',
                startDate: LessThanOrEqual(endDate.toISOString().split('T')[0]),
                endDate: MoreThanOrEqual(startDate.toISOString().split('T')[0]),
                isDeleted: false,
            },
            relations: ['leaveType'],
        });

        // Build daily detail with on-the-fly computation
        const dailyDetails = this._buildDailyDetails(
            records, shift, timesheet.year, timesheet.month, holidayDates, leaveRequests
        );

        // Enrich daily details with shift schedule info
        const shiftStartTime = shift?.startTime ? shift.startTime.substring(0, 5) : null;
        const shiftEndTime = shift?.endTime ? shift.endTime.substring(0, 5) : null;
        const enrichedDailyDetails = dailyDetails.map(d => ({
            ...d,
            shiftName: shift?.shiftName || null,
            shiftStartTime,
            shiftEndTime,
        }));

        return {
            timesheet: {
                ...timesheet,
                shiftName: shift?.shiftName || null,
                shiftStartTime,
                shiftEndTime,
            },
            dailyDetails: enrichedDailyDetails,
            summary: {
                totalDays: enrichedDailyDetails.length,
                presentDays: enrichedDailyDetails.filter(d => d.status === 'PRESENT').length,
                absentDays: enrichedDailyDetails.filter(d => d.status === 'ABSENT').length,
                lateDays: enrichedDailyDetails.filter(d => d.lateMinutes > 0).length,
                earlyLeaveDays: enrichedDailyDetails.filter(d => d.earlyLeaveMinutes > 0).length,
                holidayDays: enrichedDailyDetails.filter(d => d.status === 'HOLIDAY').length,
                weekendDays: enrichedDailyDetails.filter(d => d.status === 'WEEKEND').length,
            },
        };
    }

    // ──────────────────────────────────────
    // UC25 - Timesheet Data Management
    // ──────────────────────────────────────

    async recalculate(id, userContext) {
        const timesheet = await this.findById(id, userContext);
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

        const shift = await this._getEmployeeShift(timesheet.employeeId, timesheet.month, timesheet.year);
        const shiftHoursPerDay = shift ? this._calcShiftHours(shift) : 8;

        // Group records by date
        const dailyMap = new Map();
        records.forEach(record => {
            if (record.checkInTime && record.checkOutTime) {
                const checkIn = new Date(record.checkInTime);
                const checkOut = new Date(record.checkOutTime);
                const dateKey = `${checkIn.getFullYear()}-${String(checkIn.getMonth() + 1).padStart(2, '0')}-${String(checkIn.getDate()).padStart(2, '0')}`;

                if (!dailyMap.has(dateKey)) {
                    dailyMap.set(dateKey, { checkIn, checkOut });
                } else {
                    const existing = dailyMap.get(dateKey);
                    if (checkIn < existing.checkIn) existing.checkIn = checkIn;
                    if (checkOut > existing.checkOut) existing.checkOut = checkOut;
                }
            }
        });

        let totalWorkingDays = 0;
        let totalWorkingHours = 0;
        let overtimeHours = 0;

        for (const [, { checkIn, checkOut }] of dailyMap) {
            const actualHours = this._calcActualHours(checkIn, checkOut, shift);
            totalWorkingHours += actualHours;
            totalWorkingDays += this._calcWorkingDay(actualHours, shiftHoursPerDay);

            if (actualHours > shiftHoursPerDay) {
                overtimeHours += actualHours - shiftHoursPerDay;
            }
        }

        const result = await this.timesheetsRepository.update(id, {
            totalWorkingDays: parseFloat(totalWorkingDays.toFixed(2)),
            totalWorkingHours: parseFloat(totalWorkingHours.toFixed(2)),
            overtimeHours: parseFloat(overtimeHours.toFixed(2)),
        });

        if (this.actionLogsService) {
            await this.actionLogsService.log({
                userId: userContext?.id,
                actionType: 'RECALCULATE',
                targetTable: 'timesheets',
                targetRecordId: id,
                description: `Tính lại bảng chấm công tháng ${timesheet.month}/${timesheet.year} của ${timesheet.employee?.fullName || ''} - ${timesheet.employee?.employeeCode || ''}`,
            });
        }

        return result;
    }

    async update(id, updateDto, userContext) {
        const timesheet = await this.findById(id, userContext);
        if (timesheet.isLocked) {
            throw new BadRequestException(AppMessages.Errors.Timesheet.IS_LOCKED);
        }
        const { editReason, ...dataToSave } = updateDto;
        const result = await this.timesheetsRepository.update(id, dataToSave);

        if (this.actionLogsService) {
            const reasonNote = editReason ? ` | Lý do: ${editReason}` : '';
            await this.actionLogsService.log({
                userId: userContext?.id,
                actionType: 'UPDATE',
                targetTable: 'timesheets',
                targetRecordId: id,
                description: `Cập nhật bảng chấm công tháng ${timesheet.month}/${timesheet.year} của ${timesheet.employee?.fullName || ''} - ${timesheet.employee?.employeeCode || ''}${reasonNote}`,
                beforeData: {
                    totalWorkingDays: timesheet.totalWorkingDays,
                    totalWorkingHours: timesheet.totalWorkingHours,
                    overtimeHours: timesheet.overtimeHours,
                },
                afterData: dataToSave,
                changedFields: dataToSave,
            });
        }

        return result;
    }

    async bulkRecalculate(month, year, departmentId, userContext) {
        const options = { month, year, take: 10000, skip: 0 };
        if (departmentId) options.departmentId = departmentId;

        const { items } = await this.timesheetsRepository.findAll(options);
        const unlocked = items.filter(t => !t.isLocked);

        let recalculated = 0;
        let failed = 0;
        for (const timesheet of unlocked) {
            try {
                await this.recalculate(timesheet.id, userContext);
                recalculated++;
            } catch (err) {
                console.error(`[TimesheetsService] bulkRecalculate failed for timesheet ${timesheet.id}:`, err.message);
                failed++;
            }
        }

        if (this.actionLogsService) {
            await this.actionLogsService.log({
                userId: userContext?.id,
                actionType: 'RECALCULATE',
                targetTable: 'timesheets',
                description: `Tính lại hàng loạt tháng ${month}/${year}: thành công ${recalculated}, thất bại ${failed}`,
            });
        }

        return { recalculated, failed, total: unlocked.length };
    }

    // ──────────────────────────────────────
    // UC26 - Timesheet Locking
    // ──────────────────────────────────────

    async lock(id, userContext) {
        const timesheet = await this.findById(id, userContext);
        if (timesheet.isLocked) {
            throw new BadRequestException(AppMessages.Errors.Timesheet.ALREADY_LOCKED);
        }
        const result = await this.timesheetsRepository.update(id, { isLocked: true });

        if (this.actionLogsService) {
            await this.actionLogsService.log({
                userId: userContext?.id,
                actionType: 'LOCK',
                targetTable: 'timesheets',
                targetRecordId: id,
                description: `Khóa bảng chấm công tháng ${timesheet.month}/${timesheet.year} của ${timesheet.employee?.fullName || ''} - ${timesheet.employee?.employeeCode || ''}`,
            });
        }

        return result;
    }

    async bulkLock(month, year, departmentId, userContext) {
        // Find all unlocked timesheets for this month/year
        const options = {
            month,
            year,
            status: 'unlocked',
            take: 10000,
            skip: 0,
        };
        if (departmentId) {
            options.departmentId = departmentId;
        }

        const { items } = await this.timesheetsRepository.findAll(options);

        if (items.length === 0) {
            return { locked: 0 };
        }

        let lockedCount = 0;
        for (const timesheet of items) {
            if (!timesheet.isLocked) {
                await this.timesheetsRepository.update(timesheet.id, { isLocked: true });
                lockedCount++;
            }
        }

        if (this.actionLogsService && lockedCount > 0) {
            await this.actionLogsService.log({
                userId: userContext?.id,
                actionType: 'LOCK',
                targetTable: 'timesheets',
                description: `Khóa hàng loạt ${lockedCount} bảng chấm công tháng ${month}/${year}`,
            });
        }

        return { locked: lockedCount };
    }

    // ──────────────────────────────────────
    // UC27 - Export & Reporting
    // ──────────────────────────────────────

    async exportSummary(month, year, departmentId, userContext) {
        const options = {
            month,
            year,
            departmentId,
            take: 10000,
            skip: 0,
        };

        if (userContext && this._isEmployee(userContext)) {
            const employee = await this._getEmployeeByUserId(userContext.id);
            if (employee) {
                options.employeeId = employee.id;
            }
        }

        const { items } = await this.timesheetsRepository.findAll(options);

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

    async exportDetailed(month, year, employeeId, userContext) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        // Access check for export
        if (userContext && this._isEmployee(userContext)) {
            const employee = await this._getEmployeeByUserId(userContext.id);
            employeeId = employee?.id;
        }

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

    async _checkAccess(timesheet, userContext) {
        if (this._isEmployee(userContext)) {
            const employee = await this._getEmployeeByUserId(userContext.id);
            if (!employee || timesheet.employeeId !== employee.id) {
                throw new ForbiddenException('Bạn không có quyền truy cập dữ liệu này');
            }
        }
    }

    _isEmployee(userContext) {
        const roles = userContext.roles || [];
        return roles.includes('EMPLOYEE') && !roles.includes('ADMIN') && !roles.includes('HR');
    }

    async _getEmployeeByUserId(userId) {
        return AppDataSource.getRepository(EmployeeEntity).findOne({
            where: { userId, isDeleted: false },
        });
    }

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

    /**
     * Calculate actual working hours with break time deduction.
     * Deducts the overlapping portion of break time from the raw worked duration.
     * @param {Date} checkIn
     * @param {Date} checkOut
     * @param {Object|null} shift - WorkingShiftEntity with breakStartTime/breakEndTime
     * @returns {number} actual hours worked
     */
    _calcActualHours(checkIn, checkOut, shift) {
        const rawMinutes = (checkOut - checkIn) / (1000 * 60);

        if (!shift || !shift.breakStartTime || !shift.breakEndTime) {
            return rawMinutes / 60;
        }

        // Calculate overlap between [checkIn, checkOut] and [breakStart, breakEnd]
        const checkInMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
        const checkOutMinutes = checkOut.getHours() * 60 + checkOut.getMinutes();
        const breakStart = this._timeToMinutes(shift.breakStartTime);
        const breakEnd = this._timeToMinutes(shift.breakEndTime);

        // Overlap = max(0, min(checkOut, breakEnd) - max(checkIn, breakStart))
        const overlapStart = Math.max(checkInMinutes, breakStart);
        const overlapEnd = Math.min(checkOutMinutes, breakEnd);
        const breakOverlap = Math.max(0, overlapEnd - overlapStart);

        return (rawMinutes - breakOverlap) / 60;
    }

    /**
     * Calculate working day value based on actual hours vs shift hours.
     * - Full day  : actualHours >= 75% of shiftHours  (e.g. ≥6h for 8h shift → 1 day)
     * - Half day  : actualHours >= 40% of shiftHours  (e.g. ≥3.2h for 8h shift → 0.5 day)
     * - No day    : actualHours < 40% of shiftHours
     * This avoids penalising small lateness (e.g. 18 min late out of 8h) with a 0.5-day deduction.
     * @param {number} actualHours - hours worked (after break deduction)
     * @param {number} shiftHours  - standard shift hours for 1 full day
     * @returns {number} 1 | 0.5 | 0
     */
    _calcWorkingDay(actualHours, shiftHours) {
        if (actualHours >= shiftHours * 0.75) return 1;
        if (actualHours >= shiftHours * 0.4) return 0.5;
        return 0;
    }

    _buildDailyDetails(records, shift, year, month, holidayDates, leaveRequests = []) {
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

            const formattedDate = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
            const detail = {
                date: formattedDate,
                dayOfWeek: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][dayOfWeek],
                checkIn: null,
                checkOut: null,
                check_in: null,
                check_out: null,
                workingHours: 0,
                working_hours: 0,
                lateMinutes: 0,
                late_minutes: 0,
                earlyLeaveMinutes: 0,
                early_leave_minutes: 0,
                overtimeHours: 0,
                overtime_hours: 0,
                status: 'ABSENT',
                attendanceStatus: null,
                attendanceType: null,
                shiftName: shift?.shiftName || 'CA_HC',
                leaveType: null,
            };

            // Check if there is an approved leave request for this date
            const leave = (leaveRequests || []).find(l => {
                const start = new Date(l.startDate);
                const end = new Date(l.endDate);
                const current = new Date(dateKey);
                return current >= start && current <= end;
            });

            if (leave) {
                detail.status = 'LEAVE';
                detail.leaveType = leave.leaveType?.leaveTypeName || 'Nghỉ';
            }

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
                const checkInTimes = dayRecords.filter(r => r.checkInTime).map(r => new Date(r.checkInTime).getTime());
                const checkOutTimes = dayRecords.filter(r => r.checkOutTime).map(r => new Date(r.checkOutTime).getTime());

                const checkIn = checkInTimes.length > 0 ? new Date(Math.min(...checkInTimes)) : null;
                const checkOut = checkOutTimes.length > 0 ? new Date(Math.max(...checkOutTimes)) : null;

                const formatTime = (date) => {
                    if (!date || isNaN(date.getTime())) return '-';
                    const h = String(date.getHours()).padStart(2, '0');
                    const m = String(date.getMinutes()).padStart(2, '0');
                    return `${h}:${m}`;
                };

                detail.checkIn = formatTime(checkIn);
                detail.checkOut = formatTime(checkOut);
                detail.check_in = detail.checkIn;
                detail.check_out = detail.checkOut;

                detail.attendanceStatus = dayRecords[0].attendanceStatus;
                detail.attendanceType = dayRecords[0].attendanceType;
                detail.status = 'PRESENT';

                if (checkOut) {
                    const actualHours = this._calcActualHours(checkIn, checkOut, shift);
                    detail.workingHours = parseFloat(actualHours.toFixed(2));
                    detail.working_hours = detail.workingHours;

                    // Half-day calculation
                    detail.workingDayValue = this._calcWorkingDay(actualHours, shiftHours);
                    detail.working_day_value = detail.workingDayValue;

                    if (actualHours > shiftHours) {
                        detail.overtimeHours = parseFloat((actualHours - shiftHours).toFixed(2));
                        detail.overtime_hours = detail.overtimeHours;
                    }
                }

                // Late = check-in after shift start
                const checkInMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
                if (checkInMinutes > shiftStart) {
                    detail.lateMinutes = checkInMinutes - shiftStart;
                    detail.late_minutes = detail.lateMinutes;
                }

                // Early leave = check-out before shift end
                if (checkOut) {
                    const checkOutMinutes = checkOut.getHours() * 60 + checkOut.getMinutes();
                    if (checkOutMinutes < shiftEnd) {
                        detail.earlyLeaveMinutes = shiftEnd - checkOutMinutes;
                        detail.early_leave_minutes = detail.earlyLeaveMinutes;
                    }
                }
            }

            details.push(detail);
        }

        return details;
    }
}
