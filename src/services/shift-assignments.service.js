import { ShiftAssignmentsRepository } from '../repositories/shift-assignments.repository.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { AppDataSource } from '../database/data-source.js';
import {
  NotFoundException,
  BadRequestException,
} from '../common/exceptions/index.js';
import { AppMessages } from '../common/constants/index.js';
import { EmployeeStatus  } from '../common/enums/status.enum.js';

export class ShiftAssignmentsService {
  constructor() {
    this.assignRepo = new ShiftAssignmentsRepository();
  }

  /**
   * helper to check if two ranges overlap. null means unbounded.
   */
  _rangesOverlap = (aFrom, aTo, bFrom, bTo) => {
    if (aFrom && bTo && aFrom > bTo) return false;
    if (bFrom && aTo && bFrom > aTo) return false;
    return true;
  };

  /**
   * create assignment for either a single employee or all employees in a department.
   * dto must include exactly one of employeeId or departmentId.
   */
  async createAssignment(data) {
    const { employeeId, departmentId, shiftId, effectiveFrom, effectiveTo } =
      data;

    if (employeeId && departmentId) {
      throw new BadRequestException(
        'Chỉ được chọn nhân viên hoặc phòng ban, không được chọn cả hai',
      );
    }
    if (!employeeId && !departmentId) {
      throw new BadRequestException(
        'Phải cung cấp employeeId hoặc departmentId',
      );
    }

    const fromDate = effectiveFrom ? new Date(effectiveFrom) : null;
    const toDate = effectiveTo ? new Date(effectiveTo) : null;

    if (employeeId) {
      // single employee flow
      const emp = await AppDataSource.getRepository(EmployeeEntity).findOne({
        where: { id: employeeId, isDeleted: false },
      });
      if (!emp) {
        throw new NotFoundException(AppMessages.Errors.Employee.NOT_FOUND);
      }
      if (emp.employmentStatus === EmployeeStatus.ON_LEAVE) {
        throw new BadRequestException(
          'Không thể phân ca cho nhân viên đang nghỉ phép',
        );
      }
      // check overlaps
      const { items: existing } = await this.assignRepo.findAll({
        employeeId,
      });
      for (const ex of existing) {
        const exFrom = ex.effectiveFrom ? new Date(ex.effectiveFrom) : null;
        const exTo = ex.effectiveTo ? new Date(ex.effectiveTo) : null;
        if (this._rangesOverlap(fromDate, toDate, exFrom, exTo)) {
          throw new BadRequestException(
            'Nhân viên đã được phân một ca khác trong khoảng thời gian này',
          );
        }
      }
      return this.assignRepo.create({
        employeeId,
        departmentId: null,
        shiftId,
        effectiveFrom,
        effectiveTo,
      });
    } else {
      // department flow
      const dept = departmentId;
      const employees = await AppDataSource.getRepository(EmployeeEntity).find({
        where: { departmentId: dept, isDeleted: false },
      });
      const created = [];
      for (const emp of employees) {
        if (emp.employmentStatus === StatusEnum.ON_LEAVE) continue;
        const { items: existing } = await this.assignRepo.findAll({
          employeeId: emp.id,
        });
        let conflict = false;
        for (const ex of existing) {
          const exFrom = ex.effectiveFrom ? new Date(ex.effectiveFrom) : null;
          const exTo = ex.effectiveTo ? new Date(ex.effectiveTo) : null;
          if (this._rangesOverlap(fromDate, toDate, exFrom, exTo)) {
            conflict = true;
            break;
          }
        }
        if (conflict) continue;
        const existingRec = await this.assignRepo.create({
          employeeId: emp.id,
          departmentId: dept,
          shiftId,
          effectiveFrom,
          effectiveTo,
        });
        created.push(existingRec);
      }
      return created;
    }
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
      // skip employees on leave
      if (emp.employmentStatus === StatusEnum.ON_LEAVE) continue;

      // check overlapping for each
      const { items: existing } = await this.assignRepo.findAll({
        employeeId: emp.id,
      });
      const fromDate = effectiveFrom ? new Date(effectiveFrom) : null;
      const toDate = effectiveTo ? new Date(effectiveTo) : null;
      let conflict = false;
      for (const ex of existing) {
        const exFrom = ex.effectiveFrom ? new Date(ex.effectiveFrom) : null;
        const exTo = ex.effectiveTo ? new Date(ex.effectiveTo) : null;
        if (this._rangesOverlap(fromDate, toDate, exFrom, exTo)) {
          conflict = true;
          break;
        }
      }
      if (conflict) continue; // skip conflicting employee

      const record = await this.assignRepo.create({
        employeeId: emp.id,
        departmentId,
        shiftId,
        effectiveFrom,
        effectiveTo,
      });
      created.push(record);
    }
    return created;
  }

  async updateAssignment(id, data) {
    const assignment = await this.getById(id);
    const employeeId =
      data.employeeId !== undefined ? data.employeeId : assignment.employeeId;
    const departmentId =
      data.departmentId !== undefined
        ? data.departmentId
        : assignment.departmentId;

    if (employeeId && departmentId) {
      throw new BadRequestException(
        'Chỉ được chọn nhân viên hoặc phòng ban, không được chọn cả hai',
      );
    }
    if (!employeeId && !departmentId) {
      throw new BadRequestException(
        'Phải cung cấp employeeId hoặc departmentId',
      );
    }

    if (employeeId) {
      const emp = await AppDataSource.getRepository(EmployeeEntity).findOne({
        where: { id: employeeId, isDeleted: false },
      });
      if (emp && emp.employmentStatus === StatusEnum.ON_LEAVE) {
        throw new BadRequestException(
          'Không thể phân ca cho nhân viên đang nghỉ phép',
        );
      }
    }

    // revalidate overlaps if employee or dates changed
    const effectiveFrom = data.effectiveFrom ?? assignment.effectiveFrom;
    const effectiveTo = data.effectiveTo ?? assignment.effectiveTo;
    if (employeeId) {
      const { items: existing } = await this.assignRepo.findAll({
        employeeId,
      });
      const fromDate = effectiveFrom ? new Date(effectiveFrom) : null;
      const toDate = effectiveTo ? new Date(effectiveTo) : null;
      for (const ex of existing) {
        if (ex.id === id) continue;
        const exFrom = ex.effectiveFrom ? new Date(ex.effectiveFrom) : null;
        const exTo = ex.effectiveTo ? new Date(ex.effectiveTo) : null;
        if (this._rangesOverlap(fromDate, toDate, exFrom, exTo)) {
          throw new BadRequestException(
            'Nhân viên đã được phân một ca khác trong khoảng thời gian này',
          );
        }
      }
    }

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

  async findAll(queryDto) {
    return this.assignRepo.findAll(queryDto);
  }
}
