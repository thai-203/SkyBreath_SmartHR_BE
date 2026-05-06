import { Between, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AppMessages } from '../common/constants/index.js';
import { RequestGroupCode } from '../common/enums/request.enum.js';
import { EmployeeSalaryEntity } from '../models/entities/employee-salary.entity.js';
import { ProcessedAttendanceRecordEntity } from '../models/entities/processed-attendance-record.entity.js';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '../common/exceptions/index.js';
import { ExcelUtil } from '../common/utils/excel.util.js';
import { AppDataSource } from '../database/data-source.js';
import { AttendanceRecordEntity } from '../models/entities/attendance-record.entity.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { HolidayListEntity } from '../models/entities/holiday-list.entity.js';
import { OvertimeRequestDetailEntity } from '../models/entities/overtime-request-detail.entity.js';
import { OvertimeRuleDepartmentEntity } from '../models/entities/overtime-rule-department.entity.js';
import { OvertimeRuleEntity } from '../models/entities/overtime-rule.entity.js';
import { PenaltyEntity } from '../models/entities/penalty.entity.js';
import { RequestEntity } from '../models/entities/request.entity.js';
import { ShiftAssignmentEntity } from '../models/entities/shift-assignment.entity.js';
import { TimeSheetEntity } from '../models/entities/time-sheet.entity.js';
import { WorkingShiftEntity } from '../models/entities/working-shift.entity.js';

/** Đơn được hợp nhất vào bảng công khi sync — theo request_groups.code (không gồm OVERTIME). */
const TIMESHEET_SYNC_REQUEST_GROUP_CODES = [
  RequestGroupCode.LEAVE,
  RequestGroupCode.BUSINESS_TRIP,
  RequestGroupCode.ATTENDANCE_CORRECTION,
];

/** Cùng ngày có nhiều đơn: ưu tiên LEAVE > CT > cập nhật công. */
const TIMESHEET_SYNC_GROUP_PRIORITY = {
  [RequestGroupCode.LEAVE]: 3,
  [RequestGroupCode.BUSINESS_TRIP]: 2,
  [RequestGroupCode.ATTENDANCE_CORRECTION]: 1,
};

/** Chuẩn hóa DATE từ DB (string hoặc Date) → YYYY-MM-DD; Date dùng UTC tránh lệch múi giờ. */
function _dateKeyFromRequestField(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function _pickSyncRequestForDay(empRequests, calendarDateKey) {
  const candidates = empRequests.filter((r) => {
    const code = r.requestGroup?.code;
    if (!code || !TIMESHEET_SYNC_GROUP_PRIORITY[code]) return false;
    const start = _dateKeyFromRequestField(r.startDate);
    if (!start) return false;
    const end = _dateKeyFromRequestField(r.endDate) || start;
    return calendarDateKey >= start && calendarDateKey <= end;
  });
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  candidates.sort((a, b) => {
    const pa = TIMESHEET_SYNC_GROUP_PRIORITY[a.requestGroup?.code] || 0;
    const pb = TIMESHEET_SYNC_GROUP_PRIORITY[b.requestGroup?.code] || 0;
    if (pb !== pa) return pb - pa;
    return (a.id || 0) - (b.id || 0);
  });
  return candidates[0];
}

/** Phân tích mã ngắn chấm công (P, L, CT...) từ Request */
function _resolveRequestCode(req, isWeekend) {
  const groupCode = req.requestGroup?.code;
  if (groupCode === RequestGroupCode.BUSINESS_TRIP) {
    const name = (req.requestType?.name || '').toLowerCase();
    if (isWeekend || name.includes('ngày nghỉ') || name.includes('cuối tuần'))
      return 'CT-CN';
    return 'CT';
  }
  if (groupCode === RequestGroupCode.LEAVE) {
    const name = (req.requestType?.name || '').toLowerCase();
    if (name.includes('phép năm') || name.includes('đơn nghỉ phép')) return 'P';
    if (name.includes('thai sản')) return 'M';
    if (name.includes('không hưởng lương') || name.includes('không lương'))
      return 'R';
    if (name.includes('con ốm')) return 'C';
    if (
      name.includes('ốm đau') ||
      name.includes('bản thân ốm') ||
      name.includes('nghỉ ốm')
    )
      return 'S';
    if (name.includes('dưỡng sức')) return 'D';
    if (name.includes('tai nạn')) return 'A';
    if (
      name.includes('việc riêng') ||
      name.includes('hiếu') ||
      name.includes('hỉ') ||
      name.includes('cưới')
    )
      return 'V';
    if (name.includes('bù lễ')) return 'BL';
    if (name.includes('bù')) return 'B';
    if (
      name.includes('học') ||
      name.includes('tham quan') ||
      name.includes('nghỉ mát')
    )
      return 'H';
    if (name.includes('kỷ luật') || name.includes('chờ việc')) return 'NC';
    if (name.includes('lễ')) return 'L';
    return 'P'; // Mặc định
  }
  return null;
}

export class TimesheetsService {
  constructor(timesheetsRepository, actionLogsService) {
    this.timesheetsRepository = timesheetsRepository;
    this.actionLogsService = actionLogsService;
  }

  // ──────────────────────────────────────
  // UC24 - Monthly Timesheet Generation
  // ──────────────────────────────────────

  async generate(generateDto, userContext) {
    const {
      month,
      year,
      departmentId,
      employeeIds,
      regenerate = false,
    } = generateDto;

    // Get month boundaries
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // 1. Get active employees
    const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
    const employeeQuery = employeeRepo
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.department', 'department')
      .where('employee.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('employee.employmentStatus IN (:...statuses)', {
        statuses: ['ACTIVE', 'PROBATION'],
      });

    if (Array.isArray(employeeIds) && employeeIds.length > 0) {
      employeeQuery.andWhere('employee.id IN (:...employeeIds)', {
        employeeIds: employeeIds
          .map((id) => parseInt(id, 10))
          .filter((n) => !Number.isNaN(n)),
      });
    }

    if (departmentId) {
      employeeQuery.andWhere('employee.departmentId = :departmentId', {
        departmentId,
      });
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
            endDate.toISOString().split('T')[0],
          ),
          isDeleted: false,
        },
        {
          endDate: Between(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
          ),
          isDeleted: false,
        },
        {
          startDate: LessThanOrEqual(startDate.toISOString().split('T')[0]),
          endDate: MoreThanOrEqual(endDate.toISOString().split('T')[0]),
          isDeleted: false,
        },
      ],
    });
    const holidayDates = new Set();
    holidays.forEach((h) => {
      const current = new Date(h.startDate);
      const stop = new Date(h.endDate || h.startDate);
      while (current <= stop) {
        holidayDates.add(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    });

    // 3. Calculate standard working days (weekdays minus holidays)
    const standardWorkingDays = this._countWorkingDays(
      year,
      month,
      holidayDates,
    );

    // 4. Get attendance records for all employees this month
    const attendanceRepo = AppDataSource.getRepository(AttendanceRecordEntity);
    const allAttendance = await attendanceRepo
      .createQueryBuilder('att')
      .where('att.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('att.checkInTime >= :start', { start: startDate })
      .andWhere('att.checkInTime <= :end', { end: endDate })
      .getMany();

    // Group attendance by employeeId
    const attendanceMap = new Map();
    allAttendance.forEach((record) => {
      if (!attendanceMap.has(record.employeeId)) {
        attendanceMap.set(record.employeeId, []);
      }
      attendanceMap.get(record.employeeId).push(record);
    });

    // 5. Generate/update timesheets (per-employee shift)
    let generatedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const failedDetails = [];
    const results = [];

    for (const employee of employees) {
      try {
        const records = attendanceMap.get(employee.id) || [];

        // Get this employee's shift (or default)
        const { shift, weekdays } = await this._getEmployeeShift(
          employee.id,
          month,
          year,
        );
        const shiftHoursPerDay = shift ? this._calcShiftHours(shift) : 8;
        console.log(
          `shiftHoursPerDay for employee ${employee.id}:`,
          shiftHoursPerDay,
        );

        // Group records by date, taking earliest check-in & latest check-out per day
        const dailyMap = new Map();
        records.forEach((record) => {
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
        console.log(dailyMap);

        // Fetch OT Requests for this employee in this month
        const otDetailRepo = AppDataSource.getRepository(
          OvertimeRequestDetailEntity,
        );
        const otDetails = await otDetailRepo
          .createQueryBuilder('detail')
          .innerJoin('detail.request', 'request')
          .innerJoin('request.requestGroup', 'requestGroup')
          .where('request.employeeId = :employeeId', {
            employeeId: employee.id,
          })
          .andWhere('request.status = :status', { status: 'APPROVED' })
          .andWhere('requestGroup.code = :groupCode', { groupCode: 'OVERTIME' })
          .andWhere('detail.workDate >= :startDate', {
            startDate: startDate.toISOString().split('T')[0],
          })
          .andWhere('detail.workDate <= :endDate', {
            endDate: endDate.toISOString().split('T')[0],
          })
          .andWhere('request.isDeleted = :isDeleted', { isDeleted: false })
          .getMany();

        // Fetch EXCUSE Requests
        const requestRepo = AppDataSource.getRepository(RequestEntity);
        const excuseRequests = await requestRepo.find({
          where: {
            employeeId: employee.id,
            status: 'APPROVED',
            requestGroup: { code: In(['LATE_EARLY', 'ATTENDANCE_CORRECTION']) },
            startDate: LessThanOrEqual(endDate.toISOString().split('T')[0]),
            endDate: MoreThanOrEqual(startDate.toISOString().split('T')[0]),
            isDeleted: false,
          },
          relations: ['requestGroup'],
        });

        // Calculate totals with break deduction & half-day support
        let totalWorkingDays = 0;
        let totalWorkingHours = 0;
        let overtimeHours = 0;

        for (const [dateKey, { checkIn, checkOut }] of dailyMap) {
          let actualHours = this._calcActualHours(checkIn, checkOut, shift);
          console.log(`actualHour: ${actualHours}`);

          const excuseRequest = excuseRequests.find((r) => {
            const start = new Date(r.startDate);
            const end = new Date(r.endDate);
            const reqStart = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
            const reqEnd = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
            return dateKey >= reqStart && dateKey <= reqEnd;
          });

          if (excuseRequest && actualHours < shiftHoursPerDay) {
            actualHours = shiftHoursPerDay;
          }

          totalWorkingHours += actualHours;
          totalWorkingDays += this._calcWorkingDay(
            actualHours,
            shiftHoursPerDay,
          );

          if (actualHours > shiftHoursPerDay) {
            const actualOtHours = actualHours - shiftHoursPerDay;
            console.log(`actualOtHours for ${dateKey}:`, actualOtHours);

            const otDetail = otDetails.find((r) => {
              const d = new Date(r.workDate);
              const detailDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              return detailDate === dateKey;
            });
            console.log(`otDetail for ${dateKey}:`, otDetail);

            const otHoursAllowed = otDetail
              ? parseFloat(otDetail.totalHours || 0)
              : 0;
            overtimeHours += Math.min(actualOtHours, otHoursAllowed);
          }
        }

        // Upsert: check for existing timesheet
        const existing =
          await this.timesheetsRepository.findByEmployeeAndPeriod(
            employee.id,
            month,
            year,
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
            standardDays: parseFloat(standardWorkingDays.toFixed(2)),
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
            standardDays: parseFloat(standardWorkingDays.toFixed(2)),
            isLocked: false,
          });
          generatedCount++;
        }

        // Trigger granular summary update (calculates standardDays, officialDays, etc.)
        await this.summarizeTimesheet(employee.id, month, year, userContext);

        results.push(timesheet);
      } catch (err) {
        console.error(
          `[TimesheetsService] generate failed for employee ${employee.id}:`,
          err,
        );
        failedCount++;
        failedDetails.push({
          employeeId: employee.id,
          employeeCode: employee.employeeCode,
          fullName: employee.fullName,
          error: err?.message || String(err),
        });
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
      failedDetails,
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
      throw new NotFoundException(
        AppMessages.Errors.Timesheet.EMPLOYEE_NOT_FOUND,
      );
    }

    // Check if timesheet already exists
    const existing = await this.timesheetsRepository.findByEmployeeAndPeriod(
      employeeId,
      month,
      year,
    );
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
        {
          startDate: Between(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
          ),
          isDeleted: false,
        },
        {
          endDate: Between(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
          ),
          isDeleted: false,
        },
        {
          startDate: LessThanOrEqual(startDate.toISOString().split('T')[0]),
          endDate: MoreThanOrEqual(endDate.toISOString().split('T')[0]),
          isDeleted: false,
        },
      ],
    });
    const holidayDates = new Set();
    holidays.forEach((h) => {
      const current = new Date(h.startDate);
      const stop = new Date(h.endDate || h.startDate);
      while (current <= stop) {
        holidayDates.add(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    });

    // Get attendance records for this employee
    const attendanceRepo = AppDataSource.getRepository(AttendanceRecordEntity);
    const records = await attendanceRepo
      .createQueryBuilder('att')
      .where('att.employeeId = :employeeId', { employeeId })
      .andWhere('att.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('att.checkInTime >= :start', { start: startDate })
      .andWhere('att.checkInTime <= :end', { end: endDate })
      .getMany();

    // Calc totals with per-employee shift, break deduction & half-day
    const { shift, weekdays } = await this._getEmployeeShift(
      employeeId,
      month,
      year,
    );
    const shiftHoursPerDay = shift ? this._calcShiftHours(shift) : 8;

    // Group records by date
    const dailyMap = new Map();
    records.forEach((record) => {
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
      standardDays: 0, // Will be updated by summarizeTimesheet below
      isLocked: false,
    });

    await this.summarizeTimesheet(employeeId, month, year);

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
      console.log(
        '[TimesheetsService] findAll - identified employee:',
        employee?.id,
      );
      if (employee) {
        queryDto.employeeId = employee.id;
      } else {
        console.warn(
          '[TimesheetsService] findAll - employee record NOT FOUND for user:',
          userContext.id,
        );
        return {
          items: [],
          total: 0,
          page: queryDto.page,
          limit: queryDto.limit,
          totalPages: 0,
        };
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

  async getPeriods(queryDto) {
    const { month, year, groupByDepartment, departmentId } = queryDto;
    const periods = await this.timesheetsRepository.getPeriods({
      month,
      year,
      groupByDepartment,
      departmentId,
    });
    return periods;
  }

  async getMatrix(queryDto, userContext) {
    const { month, year, departmentId, search } = queryDto;
    const limit = queryDto.limit || 10;
    const page = queryDto.page || 1;
    const skip = (page - 1) * limit;

    const timesheetsResult = await this.timesheetsRepository.findAll({
      skip,
      take: limit,
      month,
      year,
      departmentId,
      search,
    });

    const items = [];
    for (const ts of timesheetsResult.items) {
      try {
        const details = await this.getAttendanceDetails(ts.id, userContext);
        items.push({
          id: ts.id,
          employeeCode: ts.employee?.employeeCode,
          fullName: ts.employee?.fullName,
          department: ts.employee?.department?.departmentName,
          position: ts.employee?.position?.positionName,
          totalWorkingDays: ts.totalWorkingDays,
          isLocked: ts.isLocked,
          dailyDetails: details.dailyDetails,
        });
      } catch (err) {
        console.error(
          `Failed to get details for timesheet ${ts.id}:`,
          err.message,
        );
      }
    }

    return {
      items,
      total: timesheetsResult.total,
      page,
      limit,
      totalPages: Math.ceil(timesheetsResult.total / limit),
      month,
      year,
    };
  }

  async getProcessedMatrix(queryDto, userContext) {
    const { month, year, departmentId, search } = queryDto;
    const limit = queryDto.limit || 10;
    const page = queryDto.page || 1;
    const skip = (page - 1) * limit;

    const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
    const qb = employeeRepo
      .createQueryBuilder('emp')
      .innerJoin(
        'time_sheets',
        'ts',
        'ts.employee_id = emp.id AND ts.month = :month AND ts.year = :year AND ts.deleted_at IS NULL',
        { month, year },
      )
      .leftJoinAndSelect('emp.department', 'dept')
      .leftJoinAndSelect('emp.position', 'pos')
      .where('emp.isDeleted = :isDeleted', { isDeleted: false });

    if (departmentId) {
      qb.andWhere('emp.departmentId = :departmentId', { departmentId });
    }
    if (search) {
      qb.andWhere(
        '(emp.fullName LIKE :search OR emp.employeeCode LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [employees, total] = await qb
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    if (employees.length === 0) {
      return { items: [], total, page, limit, totalPages: 0, month, year };
    }

    const empIds = employees.map((e) => e.id);

    const { ProcessedAttendanceRecordEntity } =
      await import('../models/entities/processed-attendance-record.entity.js');
    const processedRepo = AppDataSource.getRepository(
      ProcessedAttendanceRecordEntity,
    );
    const records = await processedRepo
      .createQueryBuilder('par')
      .where(
        'MONTH(par.attendanceDate) = :month AND YEAR(par.attendanceDate) = :year',
        { month, year },
      )
      .andWhere('par.employeeId IN (:...empIds)', { empIds })
      .getMany();

    const items = employees.map((emp) => {
      const empRecords = records.filter((r) => r.employeeId === emp.id);
      const dailyDetails = empRecords.map((r) => {
        let formattedDate = r.attendanceDate;
        if (typeof r.attendanceDate === 'string') {
          const parts = r.attendanceDate.split('-');
          if (parts.length === 3)
            formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else if (r.attendanceDate instanceof Date) {
          formattedDate = `${String(r.attendanceDate.getDate()).padStart(2, '0')}/${String(r.attendanceDate.getMonth() + 1).padStart(2, '0')}/${r.attendanceDate.getFullYear()}`;
        }

        return {
          recordId: r.id,
          date: formattedDate,
          checkIn: r.checkInTime,
          checkOut: r.checkOutTime,
          lateMinutes: r.lateMinutes,
          earlyLeaveMinutes: r.earlyMinutes,
          attendanceStatus: r.attendanceStatus,
          workingHours: r.workValue,
          requestId: r.requestId ?? null,
          isFinalized: !!r.isFinalized,
        };
      });

      const totalWorkingDays = empRecords.reduce(
        (sum, r) => sum + Number(r.workValue),
        0,
      );

      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        department: emp?.department?.departmentName,
        position: emp?.position?.positionName,
        totalWorkingDays: totalWorkingDays,
        dailyDetails,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      month,
      year,
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
    const records = await attendanceRepo
      .createQueryBuilder('att')
      .where('att.employeeId = :employeeId', {
        employeeId: timesheet.employeeId,
      })
      .andWhere('att.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('att.checkInTime >= :start', { start: startDate })
      .andWhere('att.checkInTime <= :end', { end: endDate })
      .orderBy('att.checkInTime', 'ASC')
      .getMany();

    // Get employee's shift assignment
    const { shift, weekdays } = await this._getEmployeeShift(
      timesheet.employeeId,
      timesheet.month,
      timesheet.year,
    );

    // Get holidays
    const holidayRepo = AppDataSource.getRepository(HolidayListEntity);
    const holidays = await holidayRepo.find({
      where: [
        {
          startDate: Between(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
          ),
          isDeleted: false,
        },
        {
          endDate: Between(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
          ),
          isDeleted: false,
        },
        {
          startDate: LessThanOrEqual(startDate.toISOString().split('T')[0]),
          endDate: MoreThanOrEqual(endDate.toISOString().split('T')[0]),
          isDeleted: false,
        },
      ],
    });
    const holidayDates = new Set();
    holidays.forEach((h) => {
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
        status: 'APPROVED',
        requestGroup: { code: 'LEAVE' },
        startDate: LessThanOrEqual(endDate.toISOString().split('T')[0]),
        endDate: MoreThanOrEqual(startDate.toISOString().split('T')[0]),
        isDeleted: false,
      },
      relations: ['requestGroup', 'requestType'],
    });

    // Get approved OT requests
    const otDetailRepo = AppDataSource.getRepository(
      OvertimeRequestDetailEntity,
    );
    const otDetails = await otDetailRepo
      .createQueryBuilder('detail')
      .innerJoin('detail.request', 'request')
      .innerJoin('request.requestGroup', 'requestGroup')
      .where('request.employeeId = :employeeId', {
        employeeId: timesheet.employeeId,
      })
      .andWhere('request.status = :status', { status: 'APPROVED' })
      .andWhere('requestGroup.code = :groupCode', { groupCode: 'OVERTIME' })
      .andWhere('detail.workDate >= :startDate', {
        startDate: startDate.toISOString().split('T')[0],
      })
      .andWhere('detail.workDate <= :endDate', {
        endDate: endDate.toISOString().split('T')[0],
      })
      .andWhere('request.isDeleted = :isDeleted', { isDeleted: false })
      .getMany();

    // Fetch EXCUSE Requests (including pending/rejected for UI display)
    const excuseRequests = await requestRepo.find({
      where: {
        employeeId: timesheet.employeeId,
        requestGroup: { code: In(['LATE_EARLY', 'ATTENDANCE_CORRECTION']) },
        startDate: LessThanOrEqual(endDate.toISOString().split('T')[0]),
        endDate: MoreThanOrEqual(startDate.toISOString().split('T')[0]),
        isDeleted: false,
      },
      relations: ['requestGroup'],
    });

    // Fetch processed records (requestId per day) for UI linking
    const { ProcessedAttendanceRecordEntity } =
      await import('../models/entities/processed-attendance-record.entity.js');
    const processedRepo = AppDataSource.getRepository(
      ProcessedAttendanceRecordEntity,
    );
    const processedRecords = await processedRepo
      .createQueryBuilder('par')
      .where(
        'MONTH(par.attendanceDate) = :month AND YEAR(par.attendanceDate) = :year',
        {
          month: timesheet.month,
          year: timesheet.year,
        },
      )
      .andWhere('par.employeeId = :employeeId', {
        employeeId: timesheet.employeeId,
      })
      .getMany();

    const requestIdByFormattedDate = new Map();
    for (const r of processedRecords) {
      if (!r.attendanceDate) continue;
      let formattedDate = r.attendanceDate;
      if (typeof r.attendanceDate === 'string') {
        const parts = r.attendanceDate.split('-');
        if (parts.length === 3)
          formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else if (r.attendanceDate instanceof Date) {
        formattedDate = `${String(r.attendanceDate.getDate()).padStart(2, '0')}/${String(
          r.attendanceDate.getMonth() + 1,
        ).padStart(2, '0')}/${r.attendanceDate.getFullYear()}`;
      }
      requestIdByFormattedDate.set(formattedDate, r.requestId ?? null);
    }

    // Build daily detail with on-the-fly computation
    const dailyDetails = this._buildDailyDetails(
      records,
      shift,
      timesheet.year,
      timesheet.month,
      holidayDates,
      leaveRequests,
      otDetails,
      excuseRequests,
      weekdays, // Pass weekdays for proper holiday logic
    );

    // Enrich daily details with shift schedule info
    const shiftStartTime = shift?.startTime
      ? shift.startTime.substring(0, 5)
      : null;
    const shiftEndTime = shift?.endTime ? shift.endTime.substring(0, 5) : null;
    const enrichedDailyDetails = dailyDetails.map((d) => ({
      ...d,
      shiftName: shift?.shiftName || null,
      shiftStartTime,
      shiftEndTime,
      requestId: requestIdByFormattedDate.get(d.date) ?? null,
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
        presentDays: enrichedDailyDetails.filter((d) => d.status === 'PRESENT')
          .length,
        absentDays: enrichedDailyDetails.filter((d) => d.status === 'ABSENT')
          .length,
        lateDays: enrichedDailyDetails.filter((d) => d.lateMinutes > 0).length,
        earlyLeaveDays: enrichedDailyDetails.filter(
          (d) => d.earlyLeaveMinutes > 0,
        ).length,
        holidayDays: enrichedDailyDetails.filter((d) => d.status === 'HOLIDAY')
          .length,
        weekendDays: enrichedDailyDetails.filter((d) => d.status === 'WEEKEND')
          .length,
      },
    };
  }

  /**
   * UC-Excuse - Get filtered late/early records for the Excuse Request page
   */
  async getLateEarlyRecords(query, userContext) {
    const { month, year, departmentId } = query;
    const isHR =
      userContext.roles.includes('HR') || userContext.roles.includes('ADMIN');

    // 1. Get employees to process
    const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
    const empQuery = employeeRepo
      .createQueryBuilder('employee')
      .where('employee.isDeleted = :isDeleted', { isDeleted: false });

    if (!isHR) {
      // For normal employee, only get their own record
      const me = await this._getEmployeeByUserId(userContext.id);
      if (!me) return [];
      empQuery.andWhere('employee.id = :id', { id: me.id });
    } else if (departmentId) {
      empQuery.andWhere('employee.departmentId = :deptId', {
        deptId: departmentId,
      });
    }

    const employees = await empQuery.getMany();
    if (employees.length === 0) return [];

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const attendanceRepo = AppDataSource.getRepository(AttendanceRecordEntity);
    const requestRepo = AppDataSource.getRepository(RequestEntity);

    let allResults = [];

    for (const employee of employees) {
      // Get attendance records
      const records = await attendanceRepo.find({
        where: {
          employeeId: employee.id,
          checkInTime: Between(startDate, endDate),
          isDeleted: false,
        },
        orderBy: { checkInTime: 'ASC' },
      });

      if (records.length === 0 && !isHR) continue;

      // Get shift
      const { shift, weekdays } = await this._getEmployeeShift(
        employee.id,
        month,
        year,
      );

      // Get excuse requests
      const excuseRequests = await requestRepo.find({
        where: {
          employeeId: employee.id,
          requestGroup: { code: In(['LATE_EARLY', 'ATTENDANCE_CORRECTION']) },
          startDate: LessThanOrEqual(endDate.toISOString().split('T')[0]),
          endDate: MoreThanOrEqual(startDate.toISOString().split('T')[0]),
          isDeleted: false,
        },
        relations: ['requestGroup'],
      });

      // Calculate daily details (minimal computed set)
      const dailyDetails = this._buildDailyDetails(
        records,
        shift,
        parseInt(year),
        parseInt(month),
        new Set(), // No holidays needed for this view
        [], // No leaves
        [], // No OT
        excuseRequests,
        weekdays, // Pass weekdays for proper weekday logic
      );

      // Filter based on role
      let filtered = [];
      // For HR, only show if has excuseRequest (pending or approved) or specifically filtered by status
      // For Employee, show if late/early OR if has excuseRequest
      if (isHR) {
        filtered = dailyDetails.filter((d) => d.excuseRequest);
      } else {
        filtered = dailyDetails.filter(
          (d) =>
            d.lateMinutes > 0 || d.earlyLeaveMinutes > 0 || d.excuseRequest,
        );
      }

      // Add employee info to each record
      const enriched = filtered.map((d) => ({
        ...d,
        employee: {
          id: employee.id,
          fullName: employee.fullName,
          employeeCode: employee.employeeCode,
        },
      }));

      allResults = allResults.concat(enriched);
    }

    return allResults;
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
    const records = await attendanceRepo
      .createQueryBuilder('att')
      .where('att.employeeId = :employeeId', {
        employeeId: timesheet.employeeId,
      })
      .andWhere('att.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('att.checkInTime >= :start', { start: startDate })
      .andWhere('att.checkInTime <= :end', { end: endDate })
      .getMany();

    const { shift, weekdays } = await this._getEmployeeShift(
      timesheet.employeeId,
      timesheet.month,
      timesheet.year,
    );
    const shiftHoursPerDay = shift ? this._calcShiftHours(shift) : 8;

    // Group records by date
    const dailyMap = new Map();
    records.forEach((record) => {
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

    // Fetch OT Requests
    const otDetailRepo = AppDataSource.getRepository(
      OvertimeRequestDetailEntity,
    );
    const otDetails = await otDetailRepo
      .createQueryBuilder('detail')
      .innerJoin('detail.request', 'request')
      .innerJoin('request.requestGroup', 'requestGroup')
      .where('request.employeeId = :employeeId', {
        employeeId: timesheet.employeeId,
      })
      .andWhere('request.status = :status', { status: 'APPROVED' })
      .andWhere('requestGroup.code = :groupCode', { groupCode: 'OVERTIME' })
      .andWhere('detail.workDate >= :startDate', {
        startDate: startDate.toISOString().split('T')[0],
      })
      .andWhere('detail.workDate <= :endDate', {
        endDate: endDate.toISOString().split('T')[0],
      })
      .andWhere('request.isDeleted = :isDeleted', { isDeleted: false })
      .getMany();

    // Fetch EXCUSE Requests
    const requestRepo = AppDataSource.getRepository(RequestEntity);
    const excuseRequests = await requestRepo.find({
      where: {
        employeeId: timesheet.employeeId,
        status: 'APPROVED',
        requestGroup: { code: In(['LATE_EARLY', 'ATTENDANCE_CORRECTION']) },
        startDate: LessThanOrEqual(endDate.toISOString().split('T')[0]),
        endDate: MoreThanOrEqual(startDate.toISOString().split('T')[0]),
        isDeleted: false,
      },
      relations: ['requestGroup'],
    });

    let totalWorkingDays = 0;
    let totalWorkingHours = 0;
    let overtimeHours = 0;

    for (const [dateKey, { checkIn, checkOut }] of dailyMap) {
      let actualHours = this._calcActualHours(checkIn, checkOut, shift);

      const excuseRequest = excuseRequests.find((r) => {
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);
        const reqStart = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
        const reqEnd = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
        return dateKey >= reqStart && dateKey <= reqEnd;
      });

      if (excuseRequest && actualHours < shiftHoursPerDay) {
        actualHours = shiftHoursPerDay;
      }

      totalWorkingHours += actualHours;
      totalWorkingDays += this._calcWorkingDay(actualHours, shiftHoursPerDay);

      if (actualHours > shiftHoursPerDay) {
        const actualOtHours = actualHours - shiftHoursPerDay;

        const otDetail = otDetails.find((r) => {
          const d = new Date(r.workDate);
          const detailDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return detailDate === dateKey;
        });

        const otHoursAllowed = otDetail
          ? parseFloat(otDetail.totalHours || 0)
          : 0;
        overtimeHours += Math.min(actualOtHours, otHoursAllowed);
      }
    }

    // Call summarizeTimesheet which now handles all logic including OT
    const updatedTimesheet = await this.summarizeTimesheet(
      timesheet.employeeId,
      timesheet.month,
      timesheet.year,
      userContext,
    );

    if (this.actionLogsService) {
      await this.actionLogsService.log({
        userId: userContext?.id,
        actionType: 'RECALCULATE',
        targetTable: 'timesheets',
        targetRecordId: id,
        description: `Tính lại bảng chấm công tháng ${timesheet.month}/${timesheet.year} của ${timesheet.employee?.fullName || ''} - ${timesheet.employee?.employeeCode || ''}`,
      });
    }

    return updatedTimesheet;
  }

  async update(id, updateDto, userContext) {
    const timesheet = await this.findById(id, userContext);
    if (timesheet.isLocked) {
      throw new BadRequestException(AppMessages.Errors.Timesheet.IS_LOCKED);
    }
    const { editReason, ...dataToSave } = updateDto;

    // Validate non-negative numeric fields
    const numericFields = [
      'totalWorkingDays',
      'totalWorkingHours',
      'overtimeHours',
    ];
    for (const field of numericFields) {
      if (dataToSave[field] !== undefined && dataToSave[field] < 0) {
        throw new BadRequestException(`${field} không được là số âm`);
      }
    }

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
    const unlocked = items.filter((t) => !t.isLocked);

    let recalculated = 0;
    let failed = 0;
    for (const timesheet of unlocked) {
      try {
        await this.recalculate(timesheet.id, userContext);
        recalculated++;
      } catch (err) {
        console.error(
          `[TimesheetsService] bulkRecalculate failed for timesheet ${timesheet.id}:`,
          err.message,
        );
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
      throw new BadRequestException(
        AppMessages.Errors.Timesheet.ALREADY_LOCKED,
      );
    }
    const result = await this.timesheetsRepository.update(id, {
      isLocked: true,
    });

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
        await this.timesheetsRepository.update(timesheet.id, {
          isLocked: true,
        });
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

  async exportDetailed(
    month,
    year,
    employeeIds,
    departmentId,
    search,
    userContext,
  ) {
    // Export "giống như dữ liệu chấm công" (processed_attendance_records),
    // not raw attendance_records.
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthStartStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEndStr = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    // Access check: EMPLOYEE-only can only export their own data
    if (userContext && this._isEmployee(userContext)) {
      const employee = await this._getEmployeeByUserId(userContext.id);
      if (employee) {
        employeeIds = [employee.id];
      }
      departmentId = undefined;
      search = undefined;
    }

    // 1) Load employees in scope (same filtering style as processed-matrix)
    const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
    const qb = employeeRepo
      .createQueryBuilder('emp')
      .leftJoinAndSelect('emp.department', 'dept')
      .leftJoinAndSelect('emp.position', 'pos')
      .where('emp.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('emp.employmentStatus IN (:...statuses)', {
        statuses: ['ACTIVE', 'PROBATION'],
      });

    if (employeeIds && employeeIds.length > 0) {
      qb.andWhere('emp.id IN (:...employeeIds)', { employeeIds });
    } else {
      if (departmentId) {
        qb.andWhere('emp.departmentId = :departmentId', { departmentId });
      }
      if (search) {
        qb.andWhere(
          '(emp.fullName LIKE :search OR emp.employeeCode LIKE :search)',
          {
            search: `%${search}%`,
          },
        );
      }
    }

    const employees = await qb.orderBy('emp.fullName', 'ASC').getMany();
    if (employees.length === 0) {
      // still return a valid empty workbook
      const ExcelJS = await import('exceljs');
      const wb = new ExcelJS.default.Workbook();
      wb.addWorksheet('Ma_tran');
      return await wb.xlsx.writeBuffer();
    }
    const empIds = employees.map((e) => e.id);

    // 2) Load processed attendance records for these employees + month
    const { ProcessedAttendanceRecordEntity } =
      await import('../models/entities/processed-attendance-record.entity.js');
    const processedRepo = AppDataSource.getRepository(
      ProcessedAttendanceRecordEntity,
    );
    const processed = await processedRepo
      .createQueryBuilder('par')
      .select([
        'par.id',
        'par.employeeId',
        'par.attendanceDate',
        'par.checkInTime',
        'par.checkOutTime',
        'par.lateMinutes',
        'par.earlyMinutes',
        'par.attendanceStatus',
        'par.workValue',
        'par.requestId',
      ])
      .where('par.employeeId IN (:...empIds)', { empIds })
      .andWhere('par.attendanceDate >= :start AND par.attendanceDate <= :end', {
        start: monthStartStr,
        end: monthEndStr,
      })
      .getMany();

    // Index records by empId|date (YYYY-MM-DD)
    const byEmpDate = new Map();
    for (const r of processed) {
      const dateKey = String(r.attendanceDate).slice(0, 10);
      byEmpDate.set(`${r.employeeId}|${dateKey}`, r);
    }

    // 3) Build Excel sheet like matrix (1 sheet, 1 row per employee)
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.default.Workbook();
    const worksheet = workbook.addWorksheet('Ma_tran');

    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayHeaders = [];
    let standardWorkingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month - 1, day);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      if (!isWeekend) standardWorkingDays++;
      const header = `${dayNames[d.getDay()]}\n(${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')})`;
      dayHeaders.push({ day, isWeekend, header });
    }

    const baseColumns = [
      { header: 'STT', width: 6 },
      { header: 'Họ tên', width: 26 },
      { header: 'Mã NS', width: 14 },
      { header: 'Chức danh', width: 18 },
    ];
    const tailColumns = [
      { header: 'Tổng công', width: 10 },
      { header: 'Công chuẩn', width: 10 },
    ];

    worksheet.columns = [
      ...baseColumns,
      ...dayHeaders.map((h) => ({ header: h.header, width: 8 })),
      ...tailColumns,
    ];

    // Header style
    const headerRow = worksheet.getRow(1);
    headerRow.height = 32;
    headerRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, size: 10, color: { argb: 'FF1E293B' } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      // weekend header light amber
      const isDayCol =
        colNumber > baseColumns.length &&
        colNumber <= baseColumns.length + dayHeaders.length;
      if (isDayCol) {
        const dayIdx = colNumber - baseColumns.length - 1;
        if (dayHeaders[dayIdx]?.isWeekend) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF7ED' },
          };
        } else {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
        }
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      }
    });

    worksheet.views = [
      { state: 'frozen', xSplit: baseColumns.length, ySplit: 1 },
    ];

    const matrixCellValue = (rec) => {
      if (!rec) return '-';
      const status = rec.attendanceStatus;
      if (status === 'WEEKEND' || status === 'N') return 'N';
      if (['X', 'KL', 'ABSENT', '0'].includes(status)) {
        return rec.workValue !== undefined && rec.workValue !== null
          ? Number(rec.workValue)
          : 0;
      }
      return status || '-';
    };

    const numberOrZero = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    employees.forEach((emp, index) => {
      const rowValues = [];
      rowValues.push(index + 1);
      rowValues.push(emp.fullName || '');
      rowValues.push(emp.employeeCode || '');
      rowValues.push(emp.position?.positionName || '');

      let total = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const rec = byEmpDate.get(`${emp.id}|${dateStr}`);
        rowValues.push(matrixCellValue(rec));
        if (rec && rec.workValue !== undefined && rec.workValue !== null) {
          total += numberOrZero(rec.workValue);
        }
      }
      rowValues.push(Number(total.toFixed(2)));
      rowValues.push(standardWorkingDays);

      const row = worksheet.addRow(rowValues);
      row.height = 20;
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        const isNumeric = typeof cell.value === 'number';
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber <= 2 ? 'left' : 'center',
          wrapText: true,
        };

        // weekend background for day columns
        const isDayCol =
          colNumber > baseColumns.length &&
          colNumber <= baseColumns.length + dayHeaders.length;
        if (isDayCol) {
          const dayIdx = colNumber - baseColumns.length - 1;
          if (dayHeaders[dayIdx]?.isWeekend) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFBEB' },
            };
          }
        }
        // totals background
        const totalStartCol = baseColumns.length + dayHeaders.length + 1;
        if (colNumber >= totalStartCol) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0FDFA' },
          };
          cell.font = { bold: true, color: { argb: 'FF0F766E' } };
        }
      });
    });

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
    return (
      roles.includes('EMPLOYEE') &&
      !roles.includes('ADMIN') &&
      !roles.includes('HR')
    );
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
      // Skip weekends (0=Sun, 6=Sat)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
    }
    return count;
  }

  async _getDefaultShift() {
    const shiftRepo = AppDataSource.getRepository(WorkingShiftEntity);
    return shiftRepo.findOne({
      where: { isDeleted: false },
      order: { id: 'ASC' },
    });
  }

  async _getEmployeeShift(employeeId, month, year) {
    const assignmentRepo = AppDataSource.getRepository(ShiftAssignmentEntity);

    // Get employee info for department lookup
    const empRepo = AppDataSource.getRepository(EmployeeEntity);
    const employee = await empRepo.findOne({
      where: { id: employeeId, isDeleted: false },
      select: ['id', 'departmentId'],
    });
    const employeeDeptId = employee?.departmentId;

    // Build effective date range for the month
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const monthStartStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEndStr = `${year}-${String(month).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;

    // Find all assignments that could apply to this employee
    // Note: We fetch all and filter in memory because MySQL JSON functions vary by version
    const allAssignments = await assignmentRepo
      .createQueryBuilder('sa')
      .leftJoinAndSelect('sa.shift', 'shift')
      .where('sa.isDeleted = :isDel', { isDel: false })
      .getMany();

    // Filter in memory for employee/department match
    const applicableAssignments = allAssignments.filter((a) => {
      // Employee direct match
      if (a.employeeId === employeeId) return true;
      // Employee IDs array match
      if (
        a.employeeIds &&
        Array.isArray(a.employeeIds) &&
        a.employeeIds.includes(employeeId)
      )
        return true;
      // Department direct match
      if (a.departmentId === employeeDeptId) return true;
      // Department IDs array match
      if (
        a.departmentIds &&
        Array.isArray(a.departmentIds) &&
        a.departmentIds.includes(employeeDeptId)
      )
        return true;
      return false;
    });

    // Filter to assignments that are effective during this month
    const effectiveAssignments = applicableAssignments.filter((a) => {
      if (!a.effectiveFrom) return true; // No start date = always effective
      const effFrom = new Date(a.effectiveFrom);
      const effTo = a.effectiveTo ? new Date(a.effectiveTo) : null;
      // Check if overlaps with month
      return effFrom <= monthEnd && (!effTo || effTo >= monthStart);
    });

    // Sort by priority: direct employeeId > employeeIds array > departmentId > departmentIds > most recent
    const sortedAssignments = effectiveAssignments.sort((a, b) => {
      // Direct employeeId match gets highest priority
      if (a.employeeId === employeeId && b.employeeId !== employeeId) return -1;
      if (b.employeeId === employeeId && a.employeeId !== employeeId) return 1;

      // EmployeeIds array match
      if (
        a.employeeIds &&
        a.employeeIds.includes(employeeId) &&
        (!b.employeeIds || !b.employeeIds.includes(employeeId))
      )
        return -1;
      if (
        b.employeeIds &&
        b.employeeIds.includes(employeeId) &&
        (!a.employeeIds || !a.employeeIds.includes(employeeId))
      )
        return 1;

      // Department match
      if (
        a.departmentId === employeeDeptId &&
        b.departmentId !== employeeDeptId
      )
        return -1;
      if (
        b.departmentId === employeeDeptId &&
        a.departmentId !== employeeDeptId
      )
        return 1;

      // Most recent effectiveFrom wins
      const dateA = a.effectiveFrom ? new Date(a.effectiveFrom) : new Date(0);
      const dateB = b.effectiveFrom ? new Date(b.effectiveFrom) : new Date(0);
      return dateB - dateA;
    });

    const assignment = sortedAssignments[0];

    if (assignment?.shift) {
      // Parse weekdays from string "1,2,3,4,5" to array [1,2,3,4,5]
      const weekdays = this._parseWeekdays(assignment.weekdays);
      return {
        shift: assignment.shift,
        weekdays,
      };
    }

    // Default: no shift assignment, treat MON-FRI as working days, SAT-SUN as weekend
    return {
      shift: await this._getDefaultShift(),
      weekdays: [1, 2, 3, 4, 5], // Mon-Fri only (Vietnam standard)
    };
  }

  /**
   * Parse weekdays from database string format to array of numbers.
   * @param {string|number[]|null} value - weekdays value from DB (e.g., "1,2,3,4,5" or [1,2,3,4,5])
   * @returns {number[]} - array of weekday numbers (0=Sun, 1=Mon, ..., 6=Sat)
   */
  _parseWeekdays(value) {
    if (!value) return [1, 2, 3, 4, 5]; // Default: Mon-Fri (Vietnam standard)
    if (Array.isArray(value)) {
      return value.map(Number).filter((v) => Number.isFinite(v));
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isFinite(v));
    }
    return [1, 2, 3, 4, 5];
  }

  _calcShiftHours(shift) {
    if (!shift.startTime || !shift.endTime) return 8;

    const start = this._timeToMinutes(shift.startTime);
    const end = this._timeToMinutes(shift.endTime);
    let total = end - start;

    if (shift.breakStartTime && shift.breakEndTime) {
      const breakStart = this._timeToMinutes(shift.breakStartTime);
      const breakEnd = this._timeToMinutes(shift.breakEndTime);
      total -= breakEnd - breakStart;
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



  _buildDailyDetails(
    records,
    shift,
    year,
    month,
    holidayDates,
    leaveRequests = [],
    otDetails = [],
    excuseRequests = [],
    weekdays = [1, 2, 3, 4, 5], // Default: Mon-Fri (Vietnam standard)
  ) {
    const daysInMonth = new Date(year, month, 0).getDate();

    // Index records by date
    const recordsByDate = new Map();
    records.forEach((r) => {
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
      const dayOfWeek = date.getDay(); // 0=CN, 1=T2, ..., 6=T7
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
        status: 'V',
        attendanceStatus: null,
        attendanceType: null,
        shiftName: shift?.shiftName || 'CA_HC',
        leaveType: null,
      };

      // Check if there is an approved leave request for this date
      const leave = (leaveRequests || []).find((l) => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        const current = new Date(dateKey);
        return current >= start && current <= end;
      });

      if (leave) {
        detail.status = 'L';
        detail.leaveType = leave.requestType?.name || 'Nghỉ';
      }

      // Check if there is an excuse request for this date
      const excuseRequest = (excuseRequests || []).find((r) => {
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);
        const reqStart = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
        const reqEnd = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
        return dateKey >= reqStart && dateKey <= reqEnd;
      });

      if (excuseRequest) {
        let parsedContent = null;
        try {
          parsedContent =
            typeof excuseRequest.requestContent === 'string'
              ? JSON.parse(excuseRequest.requestContent)
              : excuseRequest.requestContent;
        } catch (e) { }

        detail.excuseRequest = {
          id: excuseRequest.id,
          status: excuseRequest.status,
          content: parsedContent,
        };
      }

      // === LOGIC MỚI: Check weekdays TRƯỚC khi check holiday ===
      // Ngày không nằm trong ca làm việc (weekdays) → WEEKEND
      // Chỉ ngày NẰM TRONG CA LÀM VIỆC mới có thể là HOLIDAY
      const isWorkingDay = weekdays.includes(dayOfWeek);

      if (!isWorkingDay) {
        // Ngày không có trong ca làm việc (ví dụ: T7, CN với ca T2-T6)
        detail.status = 'WEEKEND';
        detail.attendanceStatus = 'WEEKEND';
        details.push(detail);
        continue;
      }

      // Ngày nằm trong ca làm VIỆC và là ngày LỄ → HOLIDAY
      if (holidayDates.has(dateKey)) {
        detail.status = 'HOLIDAY';
        detail.attendanceStatus = 'HOLIDAY';
        details.push(detail);
        continue;
      }

      const dayRecords = recordsByDate.get(dateKey);
      if (dayRecords && dayRecords.length > 0) {
        // Take earliest check-in and latest check-out
        const checkInTimes = dayRecords
          .filter((r) => r.checkInTime)
          .map((r) => new Date(r.checkInTime).getTime());
        const checkOutTimes = dayRecords
          .filter((r) => r.checkOutTime)
          .map((r) => new Date(r.checkOutTime).getTime());

        const checkIn =
          checkInTimes.length > 0 ? new Date(Math.min(...checkInTimes)) : null;
        const checkOut =
          checkOutTimes.length > 0
            ? new Date(Math.max(...checkOutTimes))
            : null;

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

        detail.attendanceType = dayRecords[0].attendanceType;

        const hasBothCheckInOut = checkIn && checkOut;

        if (hasBothCheckInOut) {
          // Có cả check-in lẫn check-out → tính công bình thường
          detail.status = 'PRESENT';

          const actualHours = this._calcActualHours(checkIn, checkOut, shift);
          detail.workingHours = parseFloat(actualHours.toFixed(2));
          detail.working_hours = detail.workingHours;

          // Half-day calculation
          detail.workingDayValue = this._calcWorkingDay(
            actualHours,
            shiftHours,
          );
          detail.working_day_value = detail.workingDayValue;

          if (actualHours > shiftHours) {
            const actualOtHours = actualHours - shiftHours;

            // Find approved OT detail for this date
            const otDetail = (otDetails || []).find((r) => {
              const d = new Date(r.workDate);
              const detailDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              return detailDate === dateKey;
            });

            const otHoursAllowed = otDetail
              ? parseFloat(otDetail.totalHours || 0)
              : 0;

            const countedOtHours = Math.min(actualOtHours, otHoursAllowed);
            detail.overtimeHours = parseFloat(countedOtHours.toFixed(2));
            detail.overtime_hours = detail.overtimeHours;
          }

          // Late = check-in after shift start
          const checkInMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
          if (checkInMinutes > shiftStart) {
            detail.lateMinutes = checkInMinutes - shiftStart;
            detail.late_minutes = detail.lateMinutes;
          }

          // Early leave = check-out before shift end
          const checkOutMinutes =
            checkOut.getHours() * 60 + checkOut.getMinutes();
          if (checkOutMinutes < shiftEnd) {
            detail.earlyLeaveMinutes = shiftEnd - checkOutMinutes;
            detail.early_leave_minutes = detail.earlyLeaveMinutes;
          }
        } else {
          // Chỉ có check-in HOẶC check-out → thiếu chấm công, không tính công
          detail.status = 'INCOMPLETE';
          detail.workingHours = 0;
          detail.working_hours = 0;
          detail.workingDayValue = 0;
          detail.working_day_value = 0;

          // Vẫn tính late nếu có checkIn
          if (checkIn) {
            const checkInMinutes =
              checkIn.getHours() * 60 + checkIn.getMinutes();
            if (checkInMinutes > shiftStart) {
              detail.lateMinutes = checkInMinutes - shiftStart;
              detail.late_minutes = detail.lateMinutes;
            }
          }
        }

        // --- Waive penalties if Excuse Request is APPROVED ---
        // Nếu có đơn giải trình chấm công (ATTENDANCE_CORRECTION) APPROVED → tính lại thành công đủ
        if (
          detail.excuseRequest &&
          detail.excuseRequest.status === 'APPROVED'
        ) {
          detail.status = 'PRESENT';
          detail.lateMinutes = 0;
          detail.late_minutes = 0;
          detail.earlyLeaveMinutes = 0;
          detail.early_leave_minutes = 0;
          if (detail.workingHours < shiftHours) {
            detail.workingHours = shiftHours;
            detail.working_hours = shiftHours;
            detail.workingDayValue = 1;
            detail.working_day_value = 1;
          }
        }

        // Set attendanceStatus based on calculated late/early values
        if (
          detail.status === 'INCOMPLETE' &&
          !(detail.excuseRequest?.status === 'APPROVED')
        ) {
          detail.attendanceStatus = 'INCOMPLETE';
        } else {
          const isLate = detail.lateMinutes > 0;
          const isEarly = detail.earlyLeaveMinutes > 0;
          if (isLate && isEarly) {
            detail.attendanceStatus = 'LATE_AND_EARLY_LEAVE';
          } else if (isLate) {
            detail.attendanceStatus = 'LATE';
          } else if (isEarly) {
            detail.attendanceStatus = 'EARLY_LEAVE';
          } else {
            detail.attendanceStatus = 'ON_TIME';
          }
        }
      }

      details.push(detail);
    }

    return details;
  }

  // ──────────────────────────────────────
  // NEW: Processed Attendance Synchronization
  // ──────────────────────────────────────
  async syncAttendance(month, year, employeeIds, userContext) {
    const monthStart = new Date(year, month - 1, 1);
    const nextMonthStart = new Date(year, month, 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    const monthStartStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEndStr = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    // 1) Get employees (scoped by employeeIds only)
    const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
    const employeeQuery = employeeRepo
      .createQueryBuilder('employee')
      .select(['employee.id'])
      .where('employee.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('employee.employmentStatus IN (:...statuses)', {
        statuses: ['ACTIVE', 'PROBATION'],
      });
    employeeQuery.andWhere('employee.id IN (:...employeeIds)', {
      employeeIds,
    });
    const employees = await employeeQuery.getMany();
    const scopedEmployeeIds = employees.map((e) => e.id);
    if (scopedEmployeeIds.length === 0) return { synced: 0 };

    // 2) Fetch raw attendance records (ONLY for employees in scope)
    //    IMPORTANT: lấy ca làm theo từng ngày từ attendance_records.working_shift_id
    //    (join working_shifts) để tính late/early đúng và lưu shift_start_time/end_time.
    const attendanceRepo = AppDataSource.getRepository(AttendanceRecordEntity);
    const rawRecords = await attendanceRepo
      .createQueryBuilder('att')
      .select([
        'att.id',
        'att.employeeId',
        'att.workDate',
        'att.workingShiftId',
        'att.assignmentId',
        'att.checkInTime',
        'att.checkOutTime',
      ])
      .where('att.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('att.employeeId IN (:...employeeIds)', {
        employeeIds: scopedEmployeeIds,
      })
      .andWhere('att.workDate >= :start', { start: monthStartStr })
      .andWhere('att.workDate <= :end', { end: monthEndStr })
      .leftJoinAndSelect('att.workingShift', 'workingShift')
      .getMany();

    // Build minimal map: employeeId -> dateKey -> { id, checkInTime, checkOutTime, shiftStartTime, shiftEndTime, workingShiftId }
    const currentMonthData = new Map();
    for (const record of rawRecords) {
      const d = record.workDate ? new Date(record.workDate) : null;
      if (!d || Number.isNaN(d.getTime())) continue;
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      let empMap = currentMonthData.get(record.employeeId);
      if (!empMap) {
        empMap = new Map();
        currentMonthData.set(record.employeeId, empMap);
      }
      const existing = empMap.get(dateKey);
      const shift = record.workingShift ?? null;
      const shiftStartTime = shift?.startTime || '08:00:00';
      const shiftEndTime = shift?.endTime || '17:00:00';
      const breakStartTime = shift?.breakStartTime || null;
      const breakEndTime = shift?.breakEndTime || null;
      const workingShiftId = shift?.id ?? null;
      const assignmentId = record.assignmentId ?? null;
      if (!existing) {
        empMap.set(dateKey, {
          id: record.id,
          checkInTime: record.checkInTime || null,
          checkOutTime: record.checkOutTime || null,
          shiftStartTime,
          shiftEndTime,
          breakStartTime,
          breakEndTime,
          workingShiftId,
          assignmentId,
        });
      } else {
        if (
          record.checkInTime &&
          (!existing.checkInTime ||
            new Date(record.checkInTime) < new Date(existing.checkInTime))
        ) {
          existing.checkInTime = record.checkInTime;
        }
        if (
          record.checkOutTime &&
          (!existing.checkOutTime ||
            new Date(record.checkOutTime) > new Date(existing.checkOutTime))
        ) {
          existing.checkOutTime = record.checkOutTime;
        }

        // Ưu tiên record có shift/assignment
        if (workingShiftId && !existing.workingShiftId) {
          existing.workingShiftId = workingShiftId;
          existing.assignmentId = assignmentId;
          existing.shiftStartTime = shiftStartTime;
          existing.shiftEndTime = shiftEndTime;
          existing.breakStartTime = breakStartTime;
          existing.breakEndTime = breakEndTime;
        }
      }
    }

    // 3) Approved requests used for sync (LEAVE/BUSINESS_TRIP/ATTENDANCE_CORRECTION) in one query
    const requestRepo = AppDataSource.getRepository(RequestEntity);
    const requests = await requestRepo
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.requestGroup', 'requestGroup')
      .leftJoinAndSelect('r.requestType', 'requestType')
      .where('r.status = :status', { status: 'APPROVED' })
      .andWhere('r.isDeleted = :isDel', { isDel: false })
      .andWhere('r.employeeId IN (:...employeeIds)', {
        employeeIds: scopedEmployeeIds,
      })
      .andWhere('requestGroup.code IN (:...codes)', {
        codes: TIMESHEET_SYNC_REQUEST_GROUP_CODES,
      })
      .andWhere('r.startDate IS NOT NULL')
      .andWhere('r.startDate <= :monthEnd', { monthEnd: monthEndStr })
      .andWhere('COALESCE(r.endDate, r.startDate) >= :monthStart', {
        monthStart: monthStartStr,
      })
      .getMany();

    // Index requests by employeeId (avoid filter() inside main loop)
    const requestsByEmployeeId = new Map();
    for (const r of requests) {
      const list = requestsByEmployeeId.get(r.employeeId) || [];
      list.push(r);
      requestsByEmployeeId.set(r.employeeId, list);
    }

    // 4) Fetch holidays overlapping this month only
    const holidayRepo = AppDataSource.getRepository(HolidayListEntity);
    const holidays = await holidayRepo.find({
      where: [
        {
          startDate: Between(monthStartStr, monthEndStr),
          isDeleted: false,
        },
        {
          endDate: Between(monthStartStr, monthEndStr),
          isDeleted: false,
        },
        {
          startDate: LessThanOrEqual(monthStartStr),
          endDate: MoreThanOrEqual(monthEndStr),
          isDeleted: false,
        },
      ],
    });
    const holidayDates = new Set();
    for (const h of holidays) {
      const start = new Date(h.startDate);
      const end = new Date(h.endDate || h.startDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (key >= monthStartStr && key <= monthEndStr) {
          holidayDates.add(key);
        }
      }
    }

    // 5) Fetch penalty rules and precompute applicable lookups per day-of-month
    const { PenaltyEntity } =
      await import('../models/entities/penalty.entity.js');
    const penaltyRepo = AppDataSource.getRepository(PenaltyEntity);
    const allPenaltyRules = await penaltyRepo.find({
      where: { status: 'ACTIVE', isDeleted: false },
    });
    const rulesOverlappingMonth = allPenaltyRules.filter((pr) => {
      const from = pr.effectiveFrom ? new Date(pr.effectiveFrom) : null;
      const to = pr.effectiveTo ? new Date(pr.effectiveTo) : null;
      if (from) from.setHours(0, 0, 0, 0);
      if (to) to.setHours(23, 59, 59, 999);
      return (!from || from < nextMonthStart) && (!to || to >= monthStart);
    });

    const penaltyLookupByDay = new Array(daysInMonth + 1);
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month - 1, day);
      dateObj.setHours(12, 0, 0, 0); // safe mid-day to avoid DST edge
      const applicable = rulesOverlappingMonth.filter((pr) => {
        const from = pr.effectiveFrom ? new Date(pr.effectiveFrom) : null;
        const to = pr.effectiveTo ? new Date(pr.effectiveTo) : null;
        if (from) from.setHours(0, 0, 0, 0);
        if (to) to.setHours(23, 59, 59, 999);
        return (!from || dateObj >= from) && (!to || dateObj <= to);
      });
      penaltyLookupByDay[day] = {
        late: applicable
          .filter((pr) => pr.violationType === 'LATE')
          .map((pr) => ({
            fromMinute: pr.fromMinute,
            toMinute: pr.toMinute,
            convertedHours: Number(pr.convertedHours || 0),
          })),
        early: applicable
          .filter((pr) => pr.violationType === 'EARLY')
          .map((pr) => ({
            fromMinute: pr.fromMinute,
            toMinute: pr.toMinute,
            convertedHours: Number(pr.convertedHours || 0),
          })),
      };
    }
    const penaltyHours = (ranges, mins) => {
      if (!mins || mins <= 0) return 0;
      for (const r of ranges) {
        if (mins >= r.fromMinute && mins <= r.toMinute) return r.convertedHours;
      }
      return 0;
    };

    // 6) Delete old processed records fast (range scan); chỉ GIỮ bản ghi đã chốt công (is_finalized = true)
    const { ProcessedAttendanceRecordEntity } =
      await import('../models/entities/processed-attendance-record.entity.js');
    const processedRepo = AppDataSource.getRepository(
      ProcessedAttendanceRecordEntity,
    );

    // Chỉ giữ ngày đã chốt công (isFinalized). Mọi bản ghi khác (kể cả chỉnh tay trước đó)
    // sẽ bị xóa và tính lại khi đồng bộ lại — đúng kỳ vọng "đồng bộ = ghi đè theo dữ liệu nguồn".
    const maybeProtectedCount = await processedRepo
      .createQueryBuilder('par')
      .where('par.employeeId IN (:...employeeIds)', {
        employeeIds: scopedEmployeeIds,
      })
      .andWhere('par.attendanceDate >= :start AND par.attendanceDate <= :end', {
        start: monthStartStr,
        end: monthEndStr,
      })
      .andWhere('par.isFinalized = :final', { final: true })
      .getCount();

    const protectedKeySet = new Set();
    if (maybeProtectedCount > 0) {
      const protectedRows = await processedRepo
        .createQueryBuilder('par')
        .select(['par.employeeId', 'par.attendanceDate'])
        .where('par.employeeId IN (:...employeeIds)', {
          employeeIds: scopedEmployeeIds,
        })
        .andWhere(
          'par.attendanceDate >= :start AND par.attendanceDate <= :end',
          {
            start: monthStartStr,
            end: monthEndStr,
          },
        )
        .andWhere('par.isFinalized = :final', { final: true })
        .getMany();

      for (const r of protectedRows) {
        protectedKeySet.add(
          `${r.employeeId}|${String(r.attendanceDate).slice(0, 10)}`,
        );
      }
    }

    await processedRepo
      .createQueryBuilder()
      .delete()
      .where('employee_id IN (:...employeeIds)', {
        employeeIds: scopedEmployeeIds,
      })
      .andWhere('attendance_date >= :start AND attendance_date <= :end', {
        start: monthStartStr,
        end: monthEndStr,
      })
      .andWhere('is_finalized = :final', { final: false })
      .execute();

    // 7) Fetch shift assignments with weekdays for all employees (for proper holiday logic)
    // Now supporting multiple assignment types: employeeId, employeeIds[], departmentId, departmentIds[]
    const shiftAssignmentRepo = AppDataSource.getRepository(
      ShiftAssignmentEntity,
    );

    // First, get employee department info
    const empRepoForSync = AppDataSource.getRepository(EmployeeEntity);
    const employeesInfo = await empRepoForSync
      .createQueryBuilder('emp')
      .select(['emp.id', 'emp.departmentId'])
      .where('emp.id IN (:...empIds)', { empIds: scopedEmployeeIds })
      .getMany();

    const employeeDeptMap = new Map();
    for (const emp of employeesInfo) {
      employeeDeptMap.set(emp.id, emp.departmentId);
    }

    // Fetch all potentially applicable assignments
    const allAssignments = await shiftAssignmentRepo
      .createQueryBuilder('sa')
      .leftJoinAndSelect('sa.shift', 'shift')
      .where('sa.isDeleted = :isDel', { isDel: false })
      .andWhere(
        `(
        (sa.employeeId IN (:...empIds)) OR
        (sa.departmentId IN (:...deptIds)) OR
        (sa.employeeIds IS NOT NULL AND sa.employeeIds != '') OR
        (sa.departmentIds IS NOT NULL AND sa.departmentIds != '')
      )`,
        {
          empIds: scopedEmployeeIds,
          deptIds: [
            ...new Set(
              employeesInfo.map((e) => e.departmentId).filter(Boolean),
            ),
          ],
        },
      )
      .getMany();

    // Build lookup map: assignmentId -> assignment entity (for per-record weekday validation)
    const assignmentById = new Map();
    for (const a of allAssignments) {
      assignmentById.set(a.id, a);
    }

    // Build map: employeeId -> weekdays array
    const employeeWeekdaysMap = new Map();
    for (const empId of scopedEmployeeIds) {
      const empDeptId = employeeDeptMap.get(empId);

      // Filter to applicable assignments for this employee
      const applicableAssignments = allAssignments.filter((a) => {
        // Check if overlaps with month
        if (a.effectiveFrom) {
          const effFrom = new Date(a.effectiveFrom);
          const effTo = a.effectiveTo ? new Date(a.effectiveTo) : null;
          const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1);
          const monthEnd = new Date(parseInt(year), parseInt(month), 0);
          if (effFrom > monthEnd) return false;
          if (effTo && effTo < monthStart) return false;
        }

        // Check if assignment applies to this employee
        if (a.employeeId === empId) return true;
        if (a.employeeIds && a.employeeIds.includes(empId)) return true;
        if (a.departmentId === empDeptId) return true;
        if (a.departmentIds && a.departmentIds.includes(empDeptId)) return true;

        return false;
      });

      // Sort by priority
      const sortedAssignments = applicableAssignments.sort((a, b) => {
        // Direct employeeId match gets highest priority
        if (a.employeeId === empId && b.employeeId !== empId) return -1;
        if (b.employeeId === empId && a.employeeId !== empId) return 1;

        // EmployeeIds array match
        if (
          a.employeeIds &&
          a.employeeIds.includes(empId) &&
          (!b.employeeIds || !b.employeeIds.includes(empId))
        )
          return -1;
        if (
          b.employeeIds &&
          b.employeeIds.includes(empId) &&
          (!a.employeeIds || !a.employeeIds.includes(empId))
        )
          return 1;

        // Department match
        if (a.departmentId === empDeptId && b.departmentId !== empDeptId)
          return -1;
        if (b.departmentId === empDeptId && a.departmentId !== empDeptId)
          return 1;

        // Most recent effectiveFrom wins
        const dateA = a.effectiveFrom ? new Date(a.effectiveFrom) : new Date(0);
        const dateB = b.effectiveFrom ? new Date(b.effectiveFrom) : new Date(0);
        return dateB - dateA;
      });

      const assignment = sortedAssignments[0];
      if (assignment?.weekdays) {
        const weekdays = this._parseWeekdays(assignment.weekdays);
        employeeWeekdaysMap.set(empId, { weekdays, assignmentId: assignment.id });
      } else {
        // Default: Mon-Fri working days
        employeeWeekdaysMap.set(empId, { weekdays: [1, 2, 3, 4, 5], assignmentId: assignment?.id || null });
      }
    }

    // 8) Rebuild day-by-day using pure objects + bulk insert (faster than entity create/save)
    const recordsToInsert = [];
    for (const empId of scopedEmployeeIds) {
      const empRawMap = currentMonthData.get(empId) || new Map();
      const empRequests = requestsByEmployeeId.get(empId) || [];
      const config = employeeWeekdaysMap.get(empId) || { weekdays: [1, 2, 3, 4, 5], assignmentId: null };
      const weekdays = config.weekdays;
      const plannedAssignmentId = config.assignmentId;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (protectedKeySet.has(`${empId}|${dateStr}`)) continue;

        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay(); // 0=CN, 1=T2, ..., 6=T7

        const raw = empRawMap.get(dateStr);
        const shiftStartStr = raw?.shiftStartTime || '08:00:00';
        const shiftEndStr = raw?.shiftEndTime || '17:00:00';
        const breakStartStr = raw?.breakStartTime || null;
        const breakEndStr = raw?.breakEndTime || null;
        const workingShiftId = raw?.workingShiftId ?? null;
        // assignmentId trong processed record dùng cho audit — vẫn giữ fallback cho ngày WEEKEND/HOLIDAY/ABSENT
        const assignmentId = raw?.assignmentId ?? plannedAssignmentId;
        const checkIn = raw?.checkInTime ? new Date(raw.checkInTime) : null;
        const checkOut = raw?.checkOutTime ? new Date(raw.checkOutTime) : null;

        // Xác định ngày làm việc dựa trên weekdays của ca trong record chấm công.
        // Ưu tiên: weekdays từ att.assignmentId → planned assignment của NV → default T2-T6.
        // Quan trọng: chấm công vào ngày không nằm trong weekdays của ca → không tính công (WEEKEND).
        const attAssignmentId = raw?.assignmentId ?? null;
        let effectiveWeekdays;
        if (attAssignmentId && assignmentById.has(attAssignmentId)) {
          effectiveWeekdays = this._parseWeekdays(
            assignmentById.get(attAssignmentId).weekdays,
          );
        } else {
          // Không có ca trong record → dùng ca kế hoạch của NV hoặc default T2-T6
          effectiveWeekdays = (
            employeeWeekdaysMap.get(empId) || { weekdays: [1, 2, 3, 4, 5] }
          ).weekdays;
        }
        const isWorkingDay = effectiveWeekdays.includes(dayOfWeek);
        const isWeekendDay = !isWorkingDay;

        const shiftStart = new Date(`${dateStr}T${shiftStartStr}`);
        const shiftEnd = new Date(`${dateStr}T${shiftEndStr}`);

        // T7/CN luôn là ngày nghỉ - không tính lễ, không tính công
        if (isWeekendDay) {
          recordsToInsert.push({
            employeeId: empId,
            attendanceDate: dateStr,
            workingShiftId,
            assignmentId,
            checkInTime: checkIn,
            checkOutTime: checkOut,
            shiftStartTime: shiftStartStr,
            shiftEndTime: shiftEndStr,
            lateMinutes: 0,
            earlyMinutes: 0,
            attendanceStatus: 'WEEKEND',
            workValue: 0.0,
            sourceType: 1,
            rawRecordId: raw?.id || null,
            requestId: null,
            isFinalized: false,
            updatedBy: userContext?.id || null,
          });
          continue; // Skip to next day
        }

        // T2-T6: xử lý bình thường (check-in/out, requests, holiday)
        let lateMins = 0;
        let earlyMins = 0;
        if (checkIn && checkIn > shiftStart) {
          lateMins = Math.floor((checkIn - shiftStart) / 60000);
        }
        if (checkOut && checkOut < shiftEnd) {
          earlyMins = Math.floor((shiftEnd - checkOut) / 60000);
        }

        let attendanceStatus = 'ABSENT';
        let workValue = 0.0;
        let reqId = null;

        const hasBothCheckInOut = checkIn && checkOut;
        const hasOnlyPartial = (checkIn || checkOut) && !hasBothCheckInOut;

        if (hasBothCheckInOut) {
          // Có cả check-in lẫn check-out → tính công chính xác theo ca.
          attendanceStatus = 'X';

          const shiftForCalc = {
            startTime: shiftStartStr,
            endTime: shiftEndStr,
            breakStartTime: breakStartStr,
            breakEndTime: breakEndStr,
          };
          const shiftHours = this._calcShiftHours(shiftForCalc);

          // ── Giờ làm thực tế ──────────────────────────────────────────────
          // effectiveStart = max(checkIn, shiftStart):
          //   - Đến đúng/trước giờ → tính từ đầu ca (không cộng giờ đến sớm)
          //   - Đến muộn          → tính từ lúc vào
          const effectiveStart = checkIn > shiftStart ? checkIn : shiftStart;
          let workedMins = Math.max(0, (checkOut - effectiveStart) / 60000);

          // Trừ giờ nghỉ giữa ca nằm trong khoảng [effectiveStart, checkOut]
          if (breakStartStr && breakEndStr) {
            const breakS = new Date(`${dateStr}T${breakStartStr}`);
            const breakE = new Date(`${dateStr}T${breakEndStr}`);
            const oStart = Math.max(effectiveStart.getTime(), breakS.getTime());
            const oEnd = Math.min(checkOut.getTime(), breakE.getTime());
            workedMins -= Math.max(0, (oEnd - oStart) / 60000);
          }
          const workedHours = Math.max(0, workedMins / 60);

          // ── Áp penalty: trừ trực tiếp khỏi giờ làm, không trừ vào workValue ──
          const lookup = penaltyLookupByDay[day];
          const lateH = penaltyHours(lookup.late, lateMins);
          const earlyH = penaltyHours(lookup.early, earlyMins);
          const netHours = Math.max(0, workedHours - lateH - earlyH);

          // workValue = netHours / shiftHours, tối đa 1.0
          workValue =
            shiftHours > 0 ? Math.min(1.0, netHours / shiftHours) : 0;

          if (workValue <= 0) {
            workValue = 0;
            attendanceStatus = 'ABSENT';
          } else if (workValue < 1.0) {
            attendanceStatus = 'KL';
          }
        } else if (hasOnlyPartial) {
          attendanceStatus = 'X'; // Vắng (thiếu chấm công)
          workValue = 0.0;
          lateMins = 0;
          earlyMins = 0;
        }

        // Retrieve all overlapping requests for the day
        const dayRequests = empRequests.filter((r) => {
          const code = r.requestGroup?.code;
          if (!code || !TIMESHEET_SYNC_GROUP_PRIORITY[code]) return false;
          const start = _dateKeyFromRequestField(r.startDate);
          if (!start) return false;
          const end = _dateKeyFromRequestField(r.endDate) || start;
          return dateStr >= start && dateStr <= end;
        });

        const correctionReq = dayRequests.find(
          (r) =>
            r.requestGroup?.code === RequestGroupCode.ATTENDANCE_CORRECTION,
        );
        const codeRequests = dayRequests.filter(
          (r) =>
            r.requestGroup?.code === RequestGroupCode.LEAVE ||
            r.requestGroup?.code === RequestGroupCode.BUSINESS_TRIP,
        );

        if (correctionReq) {
          attendanceStatus = 'X';
          workValue = 1.0;
          lateMins = 0;
          earlyMins = 0;
          reqId = correctionReq.id;
        } else if (codeRequests.length > 0) {
          reqId = codeRequests[0].id;
          // For request display, use isWorkingDay instead of weekend
          const isInSchedule = isWorkingDay;
          const mappedCodes = codeRequests.map((r) =>
            _resolveRequestCode(r, !isInSchedule),
          );

          if (codeRequests.length >= 2) {
            // [Mã 1]/[Mã 2] - Sáng làm mã 1, chiều mã 2
            attendanceStatus = `${mappedCodes[0]}/${mappedCodes[1]}`;
            workValue = 0;
            for (let i = 0; i < 2; i++) {
              const isWorked =
                codeRequests[i].isWorkedTime ||
                codeRequests[i].requestGroup?.code ===
                RequestGroupCode.BUSINESS_TRIP;
              if (isWorked) workValue += 0.5;
            }
          } else {
            const reqCode = mappedCodes[0];
            const isWorked =
              codeRequests[0].isWorkedTime ||
              codeRequests[0].requestGroup?.code ===
              RequestGroupCode.BUSINESS_TRIP;

            // Trường hợp 0.5/[Mã] - nửa làm nửa nghỉ
            if (workValue > 0 && workValue < 1.0) {
              attendanceStatus = `0.5/${reqCode}`;
              workValue = workValue + (isWorked ? 0.5 : 0);
              if (workValue > 1) workValue = 1; // max 1 công
            } else {
              // Nghỉ cả ngày mã đó
              attendanceStatus = reqCode || (!isInSchedule ? 'CT-CN' : 'CT');
              workValue = isWorked ? 1.0 : 0.0;
            }
          }
        } else if (isWorkingDay && holidayDates.has(dateStr)) {
          // CHỈ là HOLIDAY khi ngày đó nằm trong ca làm việc
          attendanceStatus = 'L';
          workValue = 1.0;
        } else if (!isWorkingDay && !checkIn && !checkOut) {
          // Không phải ngày làm việc (T7/CN với ca T2-T6) → Nghỉ hằng tuần
          attendanceStatus = 'WEEKEND'; // Thống nhất với _buildDailyDetails
          workValue = 0.0;
        } else {
          // No requests, not a holiday/normal weekend
          if (hasBothCheckInOut) {
            if (workValue === 0) attendanceStatus = 'ABSENT';
            else if (workValue < 1.0) attendanceStatus = 'KL';
            else attendanceStatus = 'X';
          } else if (hasOnlyPartial) {
            attendanceStatus = 'KL';
            workValue = 0.0;
            lateMins = 0;
            earlyMins = 0;
          } else {
            attendanceStatus = 'KL';
            workValue = 0.0;
          }
        }

        recordsToInsert.push({
          employeeId: empId,
          attendanceDate: dateStr,
          workingShiftId,
          assignmentId,
          checkInTime: checkIn,
          checkOutTime: checkOut,
          shiftStartTime: shiftStartStr,
          shiftEndTime: shiftEndStr,
          lateMinutes: lateMins,
          earlyMinutes: earlyMins,
          attendanceStatus,
          workValue,
          sourceType: 1,
          rawRecordId: raw?.id || null,
          requestId: reqId,
          isFinalized: false,
          updatedBy: userContext?.id || null,
        });
      }
    }

    // Parallel inserts (controlled concurrency) to better utilize DB throughput.
    // Tune via env if needed.
    const chunkSize = parseInt(
      process.env.TIMESHEETS_SYNC_INSERT_CHUNK || '5000',
      10,
    );
    const insertConcurrency = parseInt(
      process.env.TIMESHEETS_SYNC_INSERT_CONCURRENCY || '4',
      10,
    );

    const chunks = [];
    for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
      chunks.push(recordsToInsert.slice(i, i + chunkSize));
    }

    const runPool = async (items, worker, concurrency) => {
      const c = Math.max(1, concurrency || 1);
      let idx = 0;
      const runners = new Array(Math.min(c, items.length))
        .fill(null)
        .map(async () => {
          while (idx < items.length) {
            const current = idx++;
            await worker(items[current], current);
          }
        });
      await Promise.all(runners);
    };

    await runPool(
      chunks,
      async (chunk) => {
        await processedRepo.insert(chunk);
      },
      insertConcurrency,
    );

    if (this.actionLogsService) {
      await this.actionLogsService.log({
        userId: userContext?.id,
        actionType: 'SYNC_ATTENDANCE',
        targetTable: 'processed_attendance_records',
        description: `Synced ${recordsToInsert.length} records for month ${month}/${year}`,
      });
    }

    // AFTER successful sync, trigger a summary update for all affected employees
    try {
      console.log(
        `[SyncAttendance] Syncing summary for ${scopedEmployeeIds.length} employees...`,
      );
      for (const empId of scopedEmployeeIds) {
        await this.summarizeTimesheet(empId, month, year, userContext);
      }
    } catch (err) {
      console.error(
        `[SyncAttendance] Failed to update summaries: ${err.message}`,
      );
    }

    return {
      message: 'Sync completed successfully',
      syncedRecords: recordsToInsert.length,
      keptFinalizedDays: protectedKeySet.size,
    };
  }

  async getSummaryMatrix(queryDto, userContext) {
    const { month, year, departmentId, search } = queryDto;
    const limit = queryDto.limit || 10;
    const page = queryDto.page || 1;
    const skip = (page - 1) * limit;

    // 1. Get Employees
    const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
    const qb = employeeRepo
      .createQueryBuilder('emp')
      .innerJoin(
        'time_sheets',
        'ts',
        'ts.employee_id = emp.id AND ts.month = :month AND ts.year = :year AND ts.deleted_at IS NULL',
        { month, year },
      )
      .leftJoinAndSelect('emp.department', 'dept')
      .leftJoinAndSelect('emp.position', 'pos')
      .where('emp.isDeleted = :isDeleted', { isDeleted: false });

    if (departmentId) {
      qb.andWhere('emp.departmentId = :departmentId', { departmentId });
    }
    if (search) {
      qb.andWhere(
        '(emp.fullName LIKE :search OR emp.employeeCode LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [employees, total] = await qb
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    if (employees.length === 0) {
      return { items: [], total, page, limit, totalPages: 0, month, year };
    }

    const empIds = employees.map((e) => e.id);

    // 2. Get Holidays for standardDays calculation
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const holidayRepo = AppDataSource.getRepository(HolidayListEntity);
    const holidays = await holidayRepo.find({
      where: [
        {
          startDate: Between(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
          ),
          isDeleted: false,
        },
        {
          endDate: Between(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
          ),
          isDeleted: false,
        },
        {
          startDate: LessThanOrEqual(startDate.toISOString().split('T')[0]),
          endDate: MoreThanOrEqual(endDate.toISOString().split('T')[0]),
          isDeleted: false,
        },
      ],
    });
    const holidayDates = new Set();
    holidays.forEach((h) => {
      const current = new Date(h.startDate);
      const stop = new Date(h.endDate || h.startDate);
      while (current <= stop) {
        holidayDates.add(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    });

    const standardDays = this._countWorkingDays(year, month, holidayDates);

    const processedRepo = AppDataSource.getRepository(
      ProcessedAttendanceRecordEntity,
    );
    const records = await processedRepo
      .createQueryBuilder('par')
      .leftJoinAndSelect('par.request', 'req')
      .leftJoinAndSelect('req.requestGroup', 'rg')
      .leftJoinAndSelect('par.workingShift', 'ws')
      .where(
        'MONTH(par.attendanceDate) = :month AND YEAR(par.attendanceDate) = :year',
        { month, year },
      )
      .andWhere('par.employeeId IN (:...empIds)', { empIds })
      .getMany();

    const salaryRepo = AppDataSource.getRepository(EmployeeSalaryEntity);
    // Fetch all salary records for these employees and pick the best one in JS
    // this avoids issues with inconsistent status strings in the DB (Active vs ACTIVE vs approved etc.)
    const salaries = await salaryRepo.find({
      where: {
        employeeId: In(empIds),
        isDeleted: false,
      },
      order: { createdAt: 'DESC' },
    });

    // 4. Get Approved Overtime Requests
    const ruleRepo = AppDataSource.getRepository(OvertimeRuleEntity);
    const activeRules = await ruleRepo.find({
      where: { versionStatus: 'ACTIVE', status: 'ACTIVE', isDeleted: false },
      relations: ['overtimeType'],
    });

    const ruleDeptRepo = AppDataSource.getRepository(
      OvertimeRuleDepartmentEntity,
    );
    const ruleDepts = await ruleDeptRepo.find({
      where: { isDeleted: false },
    });

    const otDetailRepo = AppDataSource.getRepository(
      OvertimeRequestDetailEntity,
    );
    const otDetails = await otDetailRepo
      .createQueryBuilder('otd')
      .leftJoinAndSelect('otd.request', 'req')
      .leftJoinAndSelect('req.requestGroup', 'rg')
      .leftJoinAndSelect('otd.overtimeRule', 'rule')
      .leftJoinAndSelect('rule.overtimeType', 'type')
      .where('MONTH(otd.workDate) = :month AND YEAR(otd.workDate) = :year', {
        month,
        year,
      })
      .andWhere('req.status = :status', { status: 'APPROVED' })
      .andWhere('rg.code = :groupCode', { groupCode: 'OVERTIME' })
      .andWhere('req.employeeId IN (:...empIds)', { empIds })
      .getMany();

    // 5. Map and Aggregate using the specialized helper
    const items = employees.map((emp) => {
      const empRecords = records.filter((r) => r.employeeId === emp.id);
      const empOtDetails = otDetails.filter(
        (ot) => ot.request?.employeeId === emp.id,
      );

      const summary = this._aggregateEmployeeAttendanceSummary(
        emp,
        empRecords,
        empOtDetails,
        activeRules,
        ruleDepts,
        standardDays,
      );

      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        positionName: emp.position?.positionName || '',
        departmentName: emp.department?.departmentName || '',
        employmentStatus: emp.employmentStatus,
        standardDays,
        baseSalary:
          salaries.find((s) => Number(s.employeeId) === Number(emp.id))
            ?.baseSalary || 0,
        salaryType: salaries.find(
          (s) => Number(s.employeeId) === Number(emp.id),
        )?.salaryType,
        ...summary,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      month,
      year,
    };
  }

  // ──────────────────────────────────────
  // HR/Admin: Finalize / Unfinalize processed attendance (matrix lock)
  // ──────────────────────────────────────
  async finalizeProcessedMatrix(
    month,
    year,
    departmentId,
    search,
    userContext,
  ) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthStartStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEndStr = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const { ProcessedAttendanceRecordEntity } =
      await import('../models/entities/processed-attendance-record.entity.js');
    const processedRepo = AppDataSource.getRepository(
      ProcessedAttendanceRecordEntity,
    );

    const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
    const empSub = employeeRepo
      .createQueryBuilder('emp')
      .select('emp.id')
      .where('emp.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('emp.employmentStatus IN (:...statuses)', {
        statuses: ['ACTIVE', 'PROBATION'],
      });

    if (departmentId) {
      empSub.andWhere('emp.departmentId = :departmentId', { departmentId });
    }
    if (search) {
      empSub.andWhere(
        '(emp.fullName LIKE :search OR emp.employeeCode LIKE :search)',
        {
          search: `%${search}%`,
        },
      );
    }

    const updateQb = processedRepo
      .createQueryBuilder()
      .update()
      .set({
        isFinalized: true,
        updatedBy: userContext?.id || null,
      })
      .where('attendance_date >= :start AND attendance_date <= :end', {
        start: monthStartStr,
        end: monthEndStr,
      })
      .andWhere(`employee_id IN (${empSub.getQuery()})`)
      .setParameters(empSub.getParameters());

    const result = await updateQb.execute();

    if (this.actionLogsService) {
      await this.actionLogsService.log({
        userId: userContext?.id,
        actionType: 'FINALIZE',
        targetTable: 'processed_attendance_records',
        description: `Chốt công tháng ${month}/${year}${departmentId ? ` | departmentId=${departmentId}` : ''}${search ? ` | search="${search}"` : ''}: ${result.affected || 0} bản ghi`,
      });
    }

    return { affected: result.affected || 0 };
  }

  async unfinalizeProcessedMatrix(
    month,
    year,
    departmentId,
    search,
    userContext,
  ) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthStartStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEndStr = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const { ProcessedAttendanceRecordEntity } =
      await import('../models/entities/processed-attendance-record.entity.js');
    const processedRepo = AppDataSource.getRepository(
      ProcessedAttendanceRecordEntity,
    );

    const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
    const empSub = employeeRepo
      .createQueryBuilder('emp')
      .select('emp.id')
      .where('emp.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('emp.employmentStatus IN (:...statuses)', {
        statuses: ['ACTIVE', 'PROBATION'],
      });

    if (departmentId) {
      empSub.andWhere('emp.departmentId = :departmentId', { departmentId });
    }
    if (search) {
      empSub.andWhere(
        '(emp.fullName LIKE :search OR emp.employeeCode LIKE :search)',
        {
          search: `%${search}%`,
        },
      );
    }

    const updateQb = processedRepo
      .createQueryBuilder()
      .update()
      .set({
        isFinalized: false,
        updatedBy: userContext?.id || null,
      })
      .where('attendance_date >= :start AND attendance_date <= :end', {
        start: monthStartStr,
        end: monthEndStr,
      })
      .andWhere(`employee_id IN (${empSub.getQuery()})`)
      .setParameters(empSub.getParameters());

    const result = await updateQb.execute();

    if (this.actionLogsService) {
      await this.actionLogsService.log({
        userId: userContext?.id,
        actionType: 'UNFINALIZE',
        targetTable: 'processed_attendance_records',
        description: `Bỏ chốt công tháng ${month}/${year}${departmentId ? ` | departmentId=${departmentId}` : ''}${search ? ` | search="${search}"` : ''}: ${result.affected || 0} bản ghi`,
      });
    }

    return { affected: result.affected || 0 };
  }

  // ──────────────────────────────────────
  // HR: Update a single processed record's work_value
  // ──────────────────────────────────────
  async updateProcessedRecord(id, workValue, note, userContext) {
    const { ProcessedAttendanceRecordEntity } =
      await import('../models/entities/processed-attendance-record.entity.js');
    const repo = AppDataSource.getRepository(ProcessedAttendanceRecordEntity);

    const record = await repo.findOneBy({ id });
    if (!record) {
      throw new NotFoundException('Không tìm thấy bản ghi chấm công đã xử lý.');
    }
    if (record.isFinalized) {
      throw new BadRequestException(
        'Bản ghi đã được chốt công, không thể chỉnh sửa.',
      );
    }

    const oldValue = record.workValue;
    record.workValue = parseFloat(parseFloat(workValue).toFixed(4));
    if (record.workValue < 0 || record.workValue > 1) {
      throw new BadRequestException('work_value phải nằm trong khoảng 0 – 1.');
    }
    // Mark as manually overridden so future syncs don't blindly recalculate here
    record.sourceType = 2; // 2 = manual
    await repo.save(record);

    // Synchronize to the main timesheets summary table
    try {
      await this.summarizeTimesheet(
        record.employeeId,
        record.attendanceDate.getMonth() + 1,
        record.attendanceDate.getFullYear(),
        userContext,
      );
    } catch (err) {
      console.error(
        `Failed to summarize timesheet after record update: ${err.message}`,
      );
    }

    if (this.actionLogsService) {
      await this.actionLogsService.log({
        userId: userContext?.id,
        actionType: 'UPDATE',
        targetTable: 'processed_attendance_records',
        targetRecordId: id,
        description: `HR chỉnh sửa ngày công: ${oldValue} → ${record.workValue}${note ? ` | Lý do: ${note}` : ''}`,
        beforeData: { workValue: oldValue },
        afterData: { workValue: record.workValue },
      });
    }

    return record;
  }

  /**
   * Summarizes all processed attendance and OT data for an employee into the timesheets table.
   * This ensures the summary table is always the source of truth for Payroll.
   */
  async summarizeTimesheet(employeeId, month, year, userContext) {
    const timesheetRepo = AppDataSource.getRepository(TimeSheetEntity);
    let timesheet = await this.timesheetsRepository.findByEmployeeAndPeriod(
      employeeId,
      month,
      year,
    );
    if (!timesheet) {
      // Create if not exists (though typically created by generate)
      timesheet = timesheetRepo.create({
        employeeId,
        month,
        year,
        isLocked: false,
      });
    }
    if (timesheet.isLocked) return timesheet;

    const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
    const employee = await employeeRepo.findOne({
      where: { id: employeeId },
      relations: ['department'],
    });
    if (!employee) return null;

    // 1. Get Holidays for standardDays
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const holidayRepo = AppDataSource.getRepository(HolidayListEntity);
    const holidays = await holidayRepo.find({
      where: [
        {
          startDate: Between(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
          ),
          isDeleted: false,
        },
        {
          endDate: Between(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
          ),
          isDeleted: false,
        },
        {
          startDate: LessThanOrEqual(startDate.toISOString().split('T')[0]),
          endDate: MoreThanOrEqual(endDate.toISOString().split('T')[0]),
          isDeleted: false,
        },
      ],
    });
    const holidayDates = new Set();
    holidays.forEach((h) => {
      let cur = new Date(h.startDate);
      let stop = new Date(h.endDate || h.startDate);
      while (cur <= stop) {
        holidayDates.add(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }
    });
    const standardDays = this._countWorkingDays(year, month, holidayDates);

    // 2. Get Processed Records
    const processedRepo = AppDataSource.getRepository(
      ProcessedAttendanceRecordEntity,
    );
    const records = await processedRepo
      .createQueryBuilder('par')
      .leftJoinAndSelect('par.request', 'req')
      .leftJoinAndSelect('req.requestGroup', 'rg')
      .leftJoinAndSelect('par.workingShift', 'ws')
      .where(
        'MONTH(par.attendanceDate) = :m AND YEAR(par.attendanceDate) = :y',
        { m: month, y: year },
      )
      .andWhere('par.employeeId = :employeeId', { employeeId })
      .getMany();

    // 3. Get OT Details
    const otDetailRepo = AppDataSource.getRepository(
      OvertimeRequestDetailEntity,
    );
    const otDetails = await otDetailRepo
      .createQueryBuilder('otd')
      .leftJoinAndSelect('otd.request', 'req')
      .leftJoinAndSelect('req.requestGroup', 'rg')
      .leftJoinAndSelect('otd.overtimeRule', 'rule')
      .leftJoinAndSelect('rule.overtimeType', 'type')
      .where('MONTH(otd.workDate) = :m AND YEAR(otd.workDate) = :y', {
        m: month,
        y: year,
      })
      .andWhere('req.status = :s', { s: 'APPROVED' })
      .andWhere('rg.code = :groupCode', { groupCode: 'OVERTIME' })
      .andWhere('req.employeeId = :employeeId', { employeeId })
      .getMany();

    // Rules for OT resolution
    const ruleRepo = AppDataSource.getRepository(OvertimeRuleEntity);
    const activeRules = await ruleRepo.find({
      where: { versionStatus: 'ACTIVE', status: 'ACTIVE', isDeleted: false },
      relations: ['overtimeType'],
    });
    const ruleDeptRepo = AppDataSource.getRepository(
      OvertimeRuleDepartmentEntity,
    );
    const ruleDepts = await ruleDeptRepo.find({ where: { isDeleted: false } });

    // 4. Aggregate
    const summary = this._aggregateEmployeeAttendanceSummary(
      employee,
      records,
      otDetails,
      activeRules,
      ruleDepts,
      standardDays,
    );

    // 5. Update TimeSheetEntity
    Object.assign(timesheet, {
      standardDays,
      totalWorkingDays: summary.totalMonthlyDays,
      totalWorkingHours: records.reduce(
        (sum, r) => sum + Number(r.workValue) * 8,
        0,
      ), // Base hours approximation
      overtimeHours: summary.totalOtHours,
      officialDays: summary.officialDays,
      probationDays: summary.probationDays,
      businessTripDays: summary.businessTripDays,
      holidayDays: summary.holidayDays,
      benefitLeaveDays: summary.benefitLeaveDays, // H, V, C, S, D, A, M, BL, B
      annualLeaveDays: summary.annualLeaveDays, // P = Nghỉ phép năm
      unpaidLeaveDays: summary.unpaidLeaveDays, // R, KL, ABSENT
      waitingDays: summary.waitingDays || 0, // NC
      mealCount: summary.mealCount || 0,
      nightShiftOfficialDays: summary.nightShiftOfficialDays,
      nightShiftProbationDays: summary.nightShiftProbationDays,
      usedLeaveDays: summary.usedLeaveDays || 0, // Phép đã dùng
      otWeekday: summary.otWeekday,
      otWeekdayNight: summary.otWeekdayNight,
      otWeekend: summary.otWeekend,
      otWeekendNight: summary.otWeekendNight,
      otHoliday: summary.otHoliday,
      otHolidayNight: summary.otHolidayNight,
    });

    return timesheetRepo.save(timesheet);
  }

  /**
   * Shared helper for aggregating attendance data for a single employee.
   */
  _aggregateEmployeeAttendanceSummary(
    emp,
    empRecords,
    empOtDetails,
    activeRules,
    ruleDepts,
    standardDays,
  ) {
    let officialDays = 0;
    let probationDays = 0;
    let businessTripDays = 0;
    let holidayDays = 0;
    let unpaidLeaveDays = 0;
    let nightShiftOfficialDays = 0;
    let nightShiftProbationDays = 0;
    let mealCount = 0;
    let waitingDays = 0;
    let annualLeaveDays = 0; // P = Nghỉ phép năm
    let benefitLeaveDaysCount = 0; // H, V, C, S, D, A, M, BL, B = Nghỉ chế độ

    empRecords.forEach((r) => {
      const val = Number(r.workValue) || 0;
      const status = r.attendanceStatus;
      const request = r.request;
      const reqCode = request?.requestGroup?.code;

      const ws = r.workingShift;
      const isNightShift =
        ws &&
        (ws.startTime >= '22:00:00' ||
          ws.startTime < '06:00:00' ||
          (ws.shiftName &&
            (ws.shiftName.includes('Đêm') ||
              ws.shiftName.toLowerCase().includes('night'))));

      if (isNightShift && val > 0) {
        if (emp.employmentStatus === 'ACTIVE') nightShiftOfficialDays += val;
        else if (emp.employmentStatus === 'PROBATION')
          nightShiftProbationDays += val;
      }

      let isWorkingDay = false;

      // WEEKEND = T7/CN nghỉ (không tính vào ngày công nào)
      if (status === 'WEEKEND') {
        // Không tính vào ngày công nào
        return;
      }

      // Xử lý theo mã chấm công
      if (status === 'L') {
        // L = Nghỉ lễ
        holidayDays += val;
        isWorkingDay = true;
      } else if (status === 'P') {
        // P = Nghỉ phép năm (hưởng nguyên lương)
        annualLeaveDays += val;
        isWorkingDay = true;
      } else if (status === 'R' || status === 'KL' || status === 'ABSENT') {
        // R, KL, ABSENT = Nghỉ không lương
        unpaidLeaveDays += val;
      } else if (status === 'NC') {
        // NC = Nghỉ chờ việc
        waitingDays += val;
      } else if (status === 'CT' || status === 'CT-CN') {
        // CT, CT-CN = Công tác
        businessTripDays += val;
        isWorkingDay = true;
      } else if (status === 'H') {
        // H = Học, tham quan, nghỉ mát (hưởng lương)
        benefitLeaveDaysCount += val;
        isWorkingDay = true;
      } else if (status === 'V') {
        // V = Nghỉ việc riêng có hưởng lương (hiếu, hỉ...)
        benefitLeaveDaysCount += val;
        isWorkingDay = true;
      } else if (
        status === 'C' ||
        status === 'S' ||
        status === 'D' ||
        status === 'A' ||
        status === 'M'
      ) {
        // C, S, D, A, M = Nghỉ chế độ hưởng nguyên lương
        benefitLeaveDaysCount += val;
        isWorkingDay = true;
      } else if (status === 'BL' || status === 'B') {
        // BL, B = Nghỉ bù
        benefitLeaveDaysCount += val;
        isWorkingDay = true;
      } else if (request?.requestGroup) {
        // Xử lý theo request group code
        if (reqCode === 'BUSINESS_TRIP' || reqCode === 'WORK_FROM_HOME') {
          businessTripDays += val;
          isWorkingDay = true;
        } else if (reqCode === 'LEAVE') {
          if (request.isWorkedTime) {
            benefitLeaveDaysCount += val;
            isWorkingDay = true;
          } else {
            unpaidLeaveDays += val;
          }
        } else {
          // Các loại request khác
          if (emp.employmentStatus === 'ACTIVE') officialDays += val;
          else if (emp.employmentStatus === 'PROBATION') probationDays += val;
          isWorkingDay = true;
        }
      } else if (status === 'X' || val > 0) {
        // X = Đi làm đủ công
        if (emp.employmentStatus === 'ACTIVE') officialDays += val;
        else if (emp.employmentStatus === 'PROBATION') probationDays += val;
        isWorkingDay = true;
      } else {
        // Không có workValue
        unpaidLeaveDays += val;
      }

      // Count meal only if it's a working day (exclude unpaid leave and waiting)
      if (val > 0 && isWorkingDay) {
        mealCount++;
      }
    });

    let otWeekday = 0,
      otWeekdayNight = 0,
      otWeekend = 0,
      otWeekendNight = 0,
      otHoliday = 0,
      otHolidayNight = 0;
    empOtDetails.forEach((ot) => {
      const hours = Number(ot.totalHours) || 0;
      let typeCode = 'WEEKDAY';
      let effectiveRule = ot.overtimeRule;
      if (!effectiveRule) {
        const typeId = ot.overtimeTypeId || ot.request?.overtimeTypeId;
        if (typeId) {
          const workDate = new Date(ot.workDate);
          effectiveRule = activeRules.find((r) => {
            if (r.overtimeTypeId !== typeId) return false;
            const from = r.effectiveFrom ? new Date(r.effectiveFrom) : null;
            const to = r.effectiveTo ? new Date(r.effectiveTo) : null;
            if (from && workDate < from) return false;
            if (to && workDate > to) return false;
            const depts = ruleDepts
              .filter((rd) => rd.overtimeRuleId === r.id)
              .map((rd) => rd.departmentId);
            if (depts.length > 0 && !depts.includes(emp.departmentId))
              return false;
            return true;
          });
        }
      }
      if (effectiveRule)
        typeCode = effectiveRule.overtimeType?.code || 'WEEKDAY';
      const isNight =
        ot.startTime &&
        (ot.startTime >= '22:00:00' || ot.startTime < '06:00:00');
      if (typeCode === 'WEEKDAY') {
        if (isNight) otWeekdayNight += hours;
        else otWeekday += hours;
      } else if (typeCode === 'WEEKEND') {
        if (isNight) otWeekendNight += hours;
        else otWeekend += hours;
      } else if (typeCode === 'HOLIDAY') {
        if (isNight) otHolidayNight += hours;
        else otHoliday += hours;
      }
    });

    const totalOtHours =
      otWeekday +
      otWeekdayNight +
      otWeekend +
      otWeekendNight +
      otHoliday +
      otHolidayNight;
    // Tổng công = công chính thức + thử việc + công tác + lễ + phép + chế độ
    const totalMonthlyDays =
      officialDays +
      probationDays +
      businessTripDays +
      holidayDays +
      annualLeaveDays +
      benefitLeaveDaysCount;

    return {
      officialDays: Number(officialDays.toFixed(2)),
      probationDays: Number(probationDays.toFixed(2)),
      businessTripDays: Number(businessTripDays.toFixed(2)),
      holidayDays: Number(holidayDays.toFixed(2)),
      benefitLeaveDays: Number(benefitLeaveDaysCount.toFixed(2)), // H, V, C, S, D, A, M, BL, B
      annualLeaveDays: Number(annualLeaveDays.toFixed(2)), // P = Nghỉ phép năm
      unpaidLeaveDays: Number(unpaidLeaveDays.toFixed(2)),
      totalMonthlyDays: Number(totalMonthlyDays.toFixed(2)),
      nightShiftOfficialDays: Number(nightShiftOfficialDays.toFixed(2)),
      nightShiftProbationDays: Number(nightShiftProbationDays.toFixed(2)),
      waitingDays: Number(waitingDays.toFixed(2)),
      mealCount: Number(mealCount),
      usedLeaveDays: Number(annualLeaveDays.toFixed(2)), // Phép đã dùng = số ngày nghỉ phép năm
      remainingLeaveDays: 0, // Cần cập nhật từ leave_balances hoặc nhập thủ công
      otWeekday: Number(otWeekday.toFixed(2)),
      otWeekdayNight: Number(otWeekdayNight.toFixed(2)),
      otWeekend: Number(otWeekend.toFixed(2)),
      otWeekendNight: Number(otWeekendNight.toFixed(2)),
      otHoliday: Number(otHoliday.toFixed(2)),
      otHolidayNight: Number(otHolidayNight.toFixed(2)),
      totalOtHours: Number(totalOtHours.toFixed(2)),
    };
  }
}
