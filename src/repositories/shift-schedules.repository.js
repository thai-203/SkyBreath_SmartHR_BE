import { AppDataSource } from '../database/data-source.js';
import { ShiftScheduleEntity } from '../models/entities/shift-schedule.entity.js';
import { WorkingShiftEntity } from '../models/entities/working-shift.entity.js';

export class ShiftSchedulesRepository {
  constructor() {
    this.repository = AppDataSource.getRepository(ShiftScheduleEntity);
    this.shiftRepository = AppDataSource.getRepository(WorkingShiftEntity);
  }

  _dateOnly(value) {
    if (!value) return null;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  _timeToMinutes(value) {
    if (!value || typeof value !== 'string') return null;

    const parts = value.split(':');
    if (parts.length < 2) return null;

    const hour = Number(parts[0]);
    const minute = Number(parts[1]);

    if (
      !Number.isFinite(hour) ||
      !Number.isFinite(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return null;
    }

    return hour * 60 + minute;
  }

  _buildShiftIntervals(shift) {
    const start = this._timeToMinutes(shift?.startTime);
    const end = this._timeToMinutes(shift?.endTime);

    if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) {
      return [];
    }

    if (end > start) {
      return [{ start, end }];
    }

    // Overnight shift: split into two ranges.
    return [
      { start, end: 24 * 60 },
      { start: 0, end },
    ];
  }

  _shiftsOverlap(shiftA, shiftB) {
    const intervalsA = this._buildShiftIntervals(shiftA);
    const intervalsB = this._buildShiftIntervals(shiftB);

    if (intervalsA.length === 0 || intervalsB.length === 0) {
      return false;
    }

    return intervalsA.some((a) =>
      intervalsB.some((b) => a.start < b.end && b.start < a.end),
    );
  }

  async bulkCreate(dataArray) {
    if (!dataArray || dataArray.length === 0) return [];
    const rows = this.repository.create(dataArray);
    return this.repository.save(rows);
  }

  async softDeleteByAssignmentId(assignmentId) {
    return this.repository.update(
      { assignmentId, isDeleted: false },
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
    );
  }

  async findAll(options = {}) {
    const { startDate, endDate, departmentId, shiftId, employeeId, keyword } =
      options;

    const query = this.repository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.employee', 'employee')
      .leftJoinAndSelect('employee.department', 'employeeDepartment')
      .leftJoinAndSelect('schedule.department', 'department')
      .leftJoinAndSelect('schedule.shift', 'shift')
      .leftJoinAndSelect('schedule.assignment', 'assignment')
      .where('schedule.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('assignment.isDeleted = :assignmentDeleted', {
        assignmentDeleted: false,
      });

    if (startDate) {
      query.andWhere('schedule.workDate >= :startDate', { startDate });
    }
    if (endDate) {
      query.andWhere('schedule.workDate <= :endDate', { endDate });
    }
    if (departmentId) {
      query.andWhere(
        '(schedule.departmentId = :departmentId OR employee.departmentId = :departmentId)',
        { departmentId: Number(departmentId) },
      );
    }
    if (shiftId) {
      query.andWhere('schedule.shiftId = :shiftId', {
        shiftId: Number(shiftId),
      });
    }
    if (employeeId) {
      query.andWhere('schedule.employeeId = :employeeId', {
        employeeId: Number(employeeId),
      });
    }
    if (keyword) {
      query.andWhere(
        '(employee.fullName LIKE :kw OR employee.employeeCode LIKE :kw)',
        { kw: `%${keyword}%` },
      );
    }

    return query
      .orderBy('schedule.workDate', 'ASC')
      .addOrderBy('employee.fullName', 'ASC')
      .getMany();
  }

  async findFirstConflict(scheduleRows = [], excludeAssignmentId = null) {
    if (!Array.isArray(scheduleRows) || scheduleRows.length === 0) {
      return null;
    }

    const normalizedRows = scheduleRows
      .map((row) => ({
        employeeId: Number(row.employeeId),
        shiftId: Number(row.shiftId),
        workDate: this._dateOnly(row.workDate),
      }))
      .filter(
        (row) =>
          Number.isFinite(row.employeeId) &&
          row.employeeId > 0 &&
          Number.isFinite(row.shiftId) &&
          row.shiftId > 0 &&
          !!row.workDate,
      );

    const employeeIds = [
      ...new Set(normalizedRows.map((row) => row.employeeId)),
    ];
    const shiftIds = [...new Set(normalizedRows.map((row) => row.shiftId))];
    const workDates = [...new Set(normalizedRows.map((row) => row.workDate))];

    if (
      employeeIds.length === 0 ||
      shiftIds.length === 0 ||
      workDates.length === 0
    ) {
      return null;
    }

    const plannedShifts = await this.shiftRepository
      .createQueryBuilder('shift')
      .where('shift.id IN (:...shiftIds)', { shiftIds })
      .andWhere('shift.isDeleted = :isDeleted', { isDeleted: false })
      .getMany();

    const plannedShiftMap = new Map(
      plannedShifts.map((shift) => [shift.id, shift]),
    );

    const plannedRowsByEmployeeDate = new Map();
    for (const row of normalizedRows) {
      const key = `${row.employeeId}|${row.workDate}`;
      if (!plannedRowsByEmployeeDate.has(key)) {
        plannedRowsByEmployeeDate.set(key, []);
      }
      plannedRowsByEmployeeDate.get(key).push(row);
    }

    for (const [key, rows] of plannedRowsByEmployeeDate.entries()) {
      if (rows.length < 2) continue;

      for (let i = 0; i < rows.length; i++) {
        for (let j = i + 1; j < rows.length; j++) {
          const shiftA = plannedShiftMap.get(rows[i].shiftId);
          const shiftB = plannedShiftMap.get(rows[j].shiftId);
          if (this._shiftsOverlap(shiftA, shiftB)) {
            const [employeeId, workDate] = key.split('|');
            return {
              employeeId: Number(employeeId),
              workDate,
              shiftId: rows[j].shiftId,
              shift: shiftB,
            };
          }
        }
      }
    }

    const query = this.repository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.assignment', 'assignment')
      .leftJoinAndSelect('schedule.employee', 'employee')
      .leftJoinAndSelect('schedule.shift', 'shift')
      .where('schedule.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('assignment.isDeleted = :assignmentDeleted', {
        assignmentDeleted: false,
      })
      .andWhere('schedule.employeeId IN (:...employeeIds)', { employeeIds })
      .andWhere('schedule.workDate IN (:...workDates)', { workDates });

    if (excludeAssignmentId) {
      query.andWhere('schedule.assignmentId != :excludeAssignmentId', {
        excludeAssignmentId: Number(excludeAssignmentId),
      });
    }

    const existingRows = await query.getMany();
    const existingRowsByEmployeeDate = new Map();

    for (const row of existingRows) {
      const employeeId = Number(row.employeeId);
      const workDate = this._dateOnly(row.workDate);
      if (!Number.isFinite(employeeId) || !workDate) continue;

      const key = `${employeeId}|${workDate}`;
      if (!existingRowsByEmployeeDate.has(key)) {
        existingRowsByEmployeeDate.set(key, []);
      }
      existingRowsByEmployeeDate.get(key).push(row);
    }

    for (const [key, plannedRows] of plannedRowsByEmployeeDate.entries()) {
      const existingForDay = existingRowsByEmployeeDate.get(key) || [];
      if (existingForDay.length === 0) continue;

      for (const plannedRow of plannedRows) {
        const plannedShift = plannedShiftMap.get(plannedRow.shiftId);
        if (!plannedShift) continue;

        const overlapRow = existingForDay.find((existingRow) =>
          this._shiftsOverlap(plannedShift, existingRow.shift),
        );

        if (overlapRow) {
          return overlapRow;
        }
      }
    }

    return null;
  }
  async findTodayShiftByEmpId(options = {}) {
    const { employeeId, today } = options;
    return this.repository.find({
      where: { employeeId, workDate: today },
      relations: ['shift', 'employee'],
    });
  }
}
