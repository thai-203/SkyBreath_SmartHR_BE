import { ShiftAssignmentsRepository } from '../repositories/shift-assignments.repository.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { AppDataSource } from '../database/data-source.js';
import {
  NotFoundException,
  BadRequestException,
} from '../common/exceptions/index.js';
import { AppMessages } from '../common/constants/index.js';

export class ShiftAssignmentsService {
  constructor() {
    this.assignRepo = new ShiftAssignmentsRepository();
  }

  async assignToEmployee(data) {
    const { employeeId, shiftId, effectiveFrom, effectiveTo } = data;
    if (!employeeId) {
      throw new BadRequestException('employeeId is required');
    }
    // optionally verify employee exists
    const emp = await AppDataSource.getRepository(EmployeeEntity).findOne({
      where: { id: employeeId, isDeleted: false },
    });
    if (!emp) {
      throw new NotFoundException(AppMessages.Errors.Employee.NOT_FOUND);
    }
    return this.assignRepo.create({
      employeeId,
      shiftId,
      effectiveFrom,
      effectiveTo,
    });
  }

  async assignByDepartment(data) {
    const { departmentId, shiftId, effectiveFrom, effectiveTo } = data;
    if (!departmentId) {
      throw new BadRequestException('departmentId is required');
    }
    const employees = await AppDataSource.getRepository(EmployeeEntity).find({
      where: { departmentId, isDeleted: false },
    });
    const created = [];
    for (const emp of employees) {
      const existing = await this.assignRepo.create({
        employeeId: emp.id,
        shiftId,
        effectiveFrom,
        effectiveTo,
      });
      created.push(existing);
    }
    return created;
  }

  async updateAssignment(id, data) {
    const assignment = await this.getById(id);
    return this.assignRepo.update(id, data);
  }

  async cancelAssignment(id) {
    const assignment = await this.getById(id);
    return this.assignRepo.softDelete(id);
  }

  async getById(id) {
    const assignment = await this.assignRepo.findById(id);
    if (!assignment) {
      throw new NotFoundException(AppMessages.Errors.ShiftAssignment.NOT_FOUND);
    }
    return assignment;
  }

  async getEmployeeSchedule(employeeId, month, year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const { items } = await this.assignRepo.findAll({ employeeId });
    // filter by overlap with period
    return items.filter((a) => {
      const from = a.effectiveFrom ? new Date(a.effectiveFrom) : null;
      const to = a.effectiveTo ? new Date(a.effectiveTo) : null;
      if (from && from > end) return false;
      if (to && to < start) return false;
      return true;
    });
  }

  async getDepartmentSchedule(departmentId, month, year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const { items } = await this.assignRepo.findAll({ departmentId });
    return items.filter((a) => {
      const from = a.effectiveFrom ? new Date(a.effectiveFrom) : null;
      const to = a.effectiveTo ? new Date(a.effectiveTo) : null;
      if (from && from > end) return false;
      if (to && to < start) return false;
      return true;
    });
  }
}
