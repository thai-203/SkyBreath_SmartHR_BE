import { AppDataSource } from '../database/data-source.js';
import { ShiftScheduleEntity } from '../models/entities/shift-schedule.entity.js';

export class ShiftSchedulesRepository {
  constructor() {
    this.repository = AppDataSource.getRepository(ShiftScheduleEntity);
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

    const employeeIds = [
      ...new Set(
        scheduleRows
          .map((row) => Number(row.employeeId))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];
    const shiftIds = [
      ...new Set(
        scheduleRows
          .map((row) => Number(row.shiftId))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];
    const workDates = [
      ...new Set(
        scheduleRows.map((row) => this._dateOnly(row.workDate)).filter(Boolean),
      ),
    ];

    if (
      employeeIds.length === 0 ||
      shiftIds.length === 0 ||
      workDates.length === 0
    ) {
      return null;
    }

    const plannedKeys = new Set(
      scheduleRows
        .map((row) => {
          const employeeId = Number(row.employeeId);
          const shiftId = Number(row.shiftId);
          const workDate = this._dateOnly(row.workDate);
          if (
            !Number.isFinite(employeeId) ||
            employeeId <= 0 ||
            !Number.isFinite(shiftId) ||
            shiftId <= 0 ||
            !workDate
          ) {
            return null;
          }
          return `${employeeId}|${shiftId}|${workDate}`;
        })
        .filter(Boolean),
    );

    if (plannedKeys.size === 0) {
      return null;
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
      .andWhere('schedule.shiftId IN (:...shiftIds)', { shiftIds })
      .andWhere('schedule.workDate IN (:...workDates)', { workDates });

    if (excludeAssignmentId) {
      query.andWhere('schedule.assignmentId != :excludeAssignmentId', {
        excludeAssignmentId: Number(excludeAssignmentId),
      });
    }

    const existingRows = await query.getMany();
    return (
      existingRows.find((row) => {
        const key = `${Number(row.employeeId)}|${Number(row.shiftId)}|${this._dateOnly(row.workDate)}`;
        return plannedKeys.has(key);
      }) || null
    );
  }
}
