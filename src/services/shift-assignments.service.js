import { ShiftAssignmentsRepository } from '../repositories/shift-assignments.repository.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { AppDataSource } from '../database/data-source.js';
import {
  NotFoundException,
  BadRequestException,
} from '../common/exceptions/index.js';
import { AppMessages } from '../common/constants/index.js';
import { EmployeeStatus } from '../common/enums/status.enum.js';

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
   * Ensure there is no existing assignment for the same employee+shift that
   * overlaps with the provided date range. Throws BadRequestException if a
   * conflict is detected. Excludes a particular record id when provided (used
   * during update).
   */
  async _ensureNoOverlap(empId, shiftId, from, to, excludeId = null) {
    if (!empId || !shiftId) return; // nothing to check
    // use unpaginated lookup to get every existing assignment
    const items = await this.assignRepo.findByEmployeeAndShift(empId, shiftId);
    for (const a of items) {
      if (excludeId && a.id === excludeId) continue;
      const aFrom = a.effectiveFrom ? new Date(a.effectiveFrom) : null;
      const aTo = a.effectiveTo ? new Date(a.effectiveTo) : null;
      if (
        this._rangesOverlap(
          aFrom,
          aTo,
          from ? new Date(from) : null,
          to ? new Date(to) : null,
        )
      ) {
        throw new BadRequestException(
          AppMessages.Errors.ShiftAssignment.OVERLAP.message +
            ` (emp ${empId} shift ${shiftId})`,
        );
      }
    }
  }

  /**
   * create assignment for either a single employee or all employees in a department.
   * dto must include exactly one of employeeId or departmentId.
   */
  // generate all dates between start & end that match the pattern
  _generateDates(startDate, endDate, weekdays, repeatType) {
    const result = [];
    if (!startDate || !endDate) return result;
    let current = new Date(startDate);
    const last = new Date(endDate);
    // normalise weekdays to set for quick check
    const daySet = new Set(weekdays || []);

    const weekCycle = {
      weekly: 1,
      '2weeks': 2,
    };

    // for monthly we'll handle separately by adding same day each month
    if (repeatType === 'monthly') {
      while (current <= last) {
        if (
          !weekdays ||
          weekdays.length === 0 ||
          daySet.has(current.getDay() || 7)
        ) {
          result.push(new Date(current));
        }
        current.setMonth(current.getMonth() + 1);
      }
      return result;
    }

    // default to daily scanning with cycle
    let weekCounter = 0;
    while (current <= last) {
      const dayNum = current.getDay() === 0 ? 7 : current.getDay(); // convert sunday to 7
      if (!weekdays || weekdays.length === 0 || daySet.has(dayNum)) {
        // check cycle
        if (
          !repeatType ||
          repeatType === 'weekly' ||
          (weekCycle[repeatType] && weekCounter % weekCycle[repeatType] === 0)
        ) {
          result.push(new Date(current));
        }
      }
      current.setDate(current.getDate() + 1);
      // increment week counter when Monday
      if (current.getDay() === 1) {
        weekCounter++;
      }
    }
    return result;
  }

  /**
   * dto now accepts employeeIds or departmentIds arrays, plus start/end, weekdays, repeatType.
   * we create a record per employee/department assignment with pattern information stored.
   */
  async createAssignment(data) {
    const {
      employeeIds,
      departmentIds,
      shiftIds,
      shiftId,
      startDate,
      endDate,
      weekdays,
      repeatType,
    } = data;

    // basic parameter validation (more complex rules handled below)
    const shiftsToUse =
      shiftIds && shiftIds.length > 0 ? shiftIds : shiftId ? [shiftId] : [];
    if (shiftsToUse.length === 0) {
      throw new BadRequestException('Phải cung cấp ít nhất một ca làm việc');
    }

    if (
      (!employeeIds || employeeIds.length === 0) &&
      (!departmentIds || departmentIds.length === 0)
    ) {
      throw new BadRequestException(
        'Phải cung cấp danh sách employeeIds hoặc departmentIds',
      );
    }

    // date validation
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('startDate phải nhỏ hơn hoặc bằng endDate');
    }

    // pattern validation
    if (
      (repeatType === 'weekly' || repeatType === '2weeks') &&
      (!weekdays || weekdays.length === 0)
    ) {
      throw new BadRequestException(
        'Khi sử dụng repeatType weekly hoặc 2weeks phải cung cấp weekdays',
      );
    }

    // build target employee list (union of explicit ids + departments)
    // we keep track of the originating department for each emp when possible
    const targetMap = new Map(); // empId -> deptId|null
    if (employeeIds && employeeIds.length > 0) {
      employeeIds.forEach((id) => {
        if (!targetMap.has(id)) {
          targetMap.set(id, null);
        }
      });
    }
    if (departmentIds && departmentIds.length > 0) {
      for (const deptId of departmentIds) {
        const emps = await AppDataSource.getRepository(EmployeeEntity).find({
          where: { departmentId: deptId, isDeleted: false },
        });
        for (const e of emps) {
          // if employee was explicitly listed earlier we keep null dept, otherwise record the department
          if (!targetMap.has(e.id)) {
            targetMap.set(e.id, deptId);
          }
        }
      }
    }

    const assignments = [];

    const createForEmp = async (empId, deptId = null) => {
      const emp = await AppDataSource.getRepository(EmployeeEntity).findOne({
        where: { id: empId, isDeleted: false },
      });
      if (!emp) {
        throw new NotFoundException(AppMessages.Errors.Employee.NOT_FOUND);
      }
      if (emp.employmentStatus === EmployeeStatus.ON_LEAVE) {
        return; // skip employees on leave
      }

      for (const sId of shiftsToUse) {
        // check overlap/conflict with existing assignments
        await this._ensureNoOverlap(empId, sId, startDate, endDate);

        const rec = await this.assignRepo.create({
          employeeId: empId,
          departmentId: deptId,
          shiftId: sId,
          employeeIds:
            employeeIds && employeeIds.length ? employeeIds.join(',') : null,
          departmentIds:
            departmentIds && departmentIds.length
              ? departmentIds.join(',')
              : null,
          effectiveFrom: startDate,
          effectiveTo: endDate,
          weekdays: weekdays ? weekdays.join(',') : null,
          repeatType,
        });
        assignments.push(rec);
      }
    };

    for (const [empId, deptId] of targetMap) {
      await createForEmp(empId, deptId);
    }

    return assignments;
  }
  // update a single assignment record; convert any metadata arrays and pick shift
  async updateAssignment(id, data) {
    // fetch existing so we can validate changes and fallback values
    const existing = await this.assignRepo.findById(id);
    if (!existing) {
      throw new NotFoundException(
        AppMessages.Errors.ShiftAssignment.NOT_FOUND ||
          'Shift assignment not found',
      );
    }

    // normalize arrays to strings etc.
    if (data.employeeIds && Array.isArray(data.employeeIds)) {
      data.employeeIds = data.employeeIds.join(',');
    }
    if (data.departmentIds && Array.isArray(data.departmentIds)) {
      data.departmentIds = data.departmentIds.join(',');
    }
    if (
      data.shiftIds &&
      Array.isArray(data.shiftIds) &&
      data.shiftIds.length > 0
    ) {
      data.shiftId = data.shiftIds[0];
    }

    // if dates provided validate range
    const newFrom = data.effectiveFrom || existing.effectiveFrom;
    const newTo = data.effectiveTo || existing.effectiveTo;
    if (newFrom && newTo && new Date(newFrom) > new Date(newTo)) {
      throw new BadRequestException('startDate phải nhỏ hơn hoặc bằng endDate');
    }

    const empId = data.employeeId || existing.employeeId;
    const shiftId = data.shiftId || existing.shiftId;
    // check overlap with others excluding current
    await this._ensureNoOverlap(empId, shiftId, newFrom, newTo, id);

    return this.assignRepo.update(id, data);
  }
  async assignByDepartment(data) {
    // redirect to unified creation logic, validation already handled there
    return this.createAssignment(data);
  }

  async previewSchedule(data) {
    const { startDate, endDate, weekdays, repeatType, shiftIds, shiftId } =
      data;
    const ids =
      shiftIds && shiftIds.length > 0 ? shiftIds : shiftId ? [shiftId] : [];
    const dates = this._generateDates(startDate, endDate, weekdays, repeatType);
    // return list of date entries; include all shifts for each date
    return dates.map((d) => ({
      date: d.toISOString().split('T')[0],
      shiftIds: ids,
    }));
  }

  async getEmployeeSchedule(employeeId, startDate, endDate) {
    // if start/end provided use them, else fall back to month/year
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // period passed as month/year previously
      const [month, year] = [startDate ? parseInt(startDate) : null, null];
      // not used
      start = new Date();
      end = new Date();
    }
    const { items } = await this.assignRepo.findAll({ employeeId });
    return this._expandAssignments(items, start, end);
  }

  async getDepartmentSchedule(departmentId, startDate, endDate) {
    let start = startDate ? new Date(startDate) : null;
    let end = endDate ? new Date(endDate) : null;
    if (!start || !end) {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    const { items } = await this.assignRepo.findAll({ departmentId });
    return this._expandAssignments(items, start, end);
  }

  // take raw assignment records and expand them to daily schedule entries within range
  _expandAssignments(assignments, start, end) {
    const result = [];
    for (const a of assignments) {
      const from = a.effectiveFrom ? new Date(a.effectiveFrom) : null;
      const to = a.effectiveTo ? new Date(a.effectiveTo) : null;
      // compute intersection with [start,end]
      const rangeStart = from && from > start ? from : start;
      const rangeEnd = to && to < end ? to : end;
      if (rangeEnd < rangeStart) continue;
      const weekdays = a.weekdays ? a.weekdays.split(',').map(Number) : [];
      const repeatType = a.repeatType;
      const dates = this._generateDates(
        rangeStart,
        rangeEnd,
        weekdays,
        repeatType,
      );
      dates.forEach((d) => {
        result.push({
          ...a,
          date: d.toISOString().split('T')[0],
        });
      });
    }
    return result;
  }

  async findAll(queryDto) {
    return this.assignRepo.findAll(queryDto);
  }

  // new method for /schedules
  async getSchedules(query) {
    const { startDate, endDate, departmentId, shiftId, keyword } = query;

    // basic date validation
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('startDate phải nhỏ hơn hoặc bằng endDate');
    }

    // find raw assignments by filters
    const { items } = await this.assignRepo.findAll({ departmentId, shiftId });
    // optionally filter by keyword against employee name or code
    let filtered = items;
    if (keyword) {
      filtered = filtered.filter((a) => {
        const name = a.employee?.name || '';
        const code = a.employee?.employeeCode || '';
        return (
          name.toLowerCase().includes(keyword.toLowerCase()) ||
          code.toLowerCase().includes(keyword.toLowerCase())
        );
      });
    }
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();
    return this._expandAssignments(filtered, start, end);
  }
}
