import { AppDataSource } from '../database/data-source.js';
import { ShiftScheduleEntity } from '../models/entities/shift-schedule.entity.js';

export class ShiftSchedulesRepository {
  constructor() {
    this.repository = AppDataSource.getRepository(ShiftScheduleEntity);
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
}
