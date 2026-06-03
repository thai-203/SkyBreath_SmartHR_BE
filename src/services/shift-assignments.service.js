import { ShiftAssignmentsRepository } from '../repositories/shift-assignments.repository.js';
import { ShiftSchedulesRepository } from '../repositories/shift-schedules.repository.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { DepartmentEntity } from '../models/entities/department.entity.js';
import { WorkingShiftEntity } from '../models/entities/working-shift.entity.js';
import { AppDataSource } from '../database/data-source.js';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '../common/exceptions/index.js';
import { AppMessages } from '../common/constants/index.js';
import { EmployeeStatus } from '../common/enums/status.enum.js';

export class ShiftAssignmentsService {
  constructor() {
    this.assignRepo = new ShiftAssignmentsRepository();
    this.scheduleRepo = new ShiftSchedulesRepository();
  }

  _toNumberArray(value, fallback = []) {
    if (!value) return fallback || [];
    if (Array.isArray(value)) {
      const arr = value
        .map((v) => Number(v))
        .filter((v) => Number.isFinite(v) && v > 0);
      return arr.length > 0 ? arr : fallback || [];
    }
    const arr = String(value)
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isFinite(v) && v > 0);
    return arr.length > 0 ? arr : fallback || [];
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

  _todayDateOnly() {
    const now = new Date();
    return this._dateOnly(
      new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    );
  }

  _assertStartDateNotInPast(startDate, message) {
    if (!startDate) return;

    const normalizedStartDate = this._dateOnly(startDate);
    if (!normalizedStartDate) {
      throw new BadRequestException('Ngày bắt đầu không hợp lệ');
    }

    if (normalizedStartDate < this._todayDateOnly()) {
      throw new BadRequestException(
        message || 'Không thể phân ca cho ngày trong quá khứ',
      );
    }
  }

  _resolveRange(startDate, endDate) {
    if (startDate && endDate) {
      return {
        start: this._dateOnly(startDate),
        end: this._dateOnly(endDate),
      };
    }

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: this._dateOnly(start),
      end: this._dateOnly(end),
    };
  }

  _expandLegacyEmployeeAssignments(
    assignments,
    employeeId,
    startDate,
    endDate,
  ) {
    const { start, end } = this._resolveRange(startDate, endDate);
    const startObj = new Date(`${start}T00:00:00`);
    const endObj = new Date(`${end}T00:00:00`);

    const rows = [];

    assignments.forEach((assignment) => {
      const fromDate = assignment.effectiveFrom
        ? this._dateOnly(assignment.effectiveFrom)
        : start;
      const toDate = assignment.effectiveTo
        ? this._dateOnly(assignment.effectiveTo)
        : end;

      if (!fromDate || !toDate) return;

      const fromObj = new Date(`${fromDate}T00:00:00`);
      const toObj = new Date(`${toDate}T00:00:00`);

      if (toObj < startObj || fromObj > endObj) {
        return;
      }

      const weekdays = this._toNumberArray(assignment.weekdays);
      const repeatType = assignment.repeatType || 'weekly';
      const rangeStart = fromObj > startObj ? fromObj : startObj;
      const rangeEnd = toObj < endObj ? toObj : endObj;

      const workDates = this._generateDates(
        this._dateOnly(rangeStart),
        this._dateOnly(rangeEnd),
        weekdays,
        repeatType,
      );

      workDates.forEach((date) => {
        rows.push({
          id: `${assignment.id}-${date}-${assignment.shiftId}`,
          assignmentId: assignment.id,
          employeeId,
          shiftId: assignment.shiftId,
          shift: assignment.shift || null,
          employee: assignment.employee || null,
          date,
          workDate: date,
          effectiveFrom: assignment.effectiveFrom || null,
          effectiveTo: assignment.effectiveTo || null,
        });
      });
    });

    return rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  _rangesOverlap = (aFrom, aTo, bFrom, bTo) => {
    if (aFrom && bTo && aFrom > bTo) return false;
    if (bFrom && aTo && bFrom > aTo) return false;
    return true;
  };

  _generateDates(startDate, endDate, weekdays, repeatType) {
    const result = [];
    if (!startDate || !endDate) return result;

    const daySet = new Set((weekdays || []).map(Number));
    const last = new Date(endDate);
    let current = new Date(startDate);

    if (repeatType === 'monthly') {
      while (current <= last) {
        const dayNum = current.getDay() === 0 ? 7 : current.getDay();
        if (daySet.size === 0 || daySet.has(dayNum)) {
          result.push(this._dateOnly(current));
        }
        current.setMonth(current.getMonth() + 1);
      }
      return result;
    }

    let weekCounter = 0;
    while (current <= last) {
      const dayNum = current.getDay() === 0 ? 7 : current.getDay();
      const dayMatched = daySet.size === 0 || daySet.has(dayNum);
      const cycleMatched =
        !repeatType ||
        repeatType === 'weekly' ||
        (repeatType === '2weeks' && weekCounter % 2 === 0);

      if (dayMatched && cycleMatched) {
        result.push(this._dateOnly(current));
      }

      current.setDate(current.getDate() + 1);
      if (current.getDay() === 1) {
        weekCounter++;
      }
    }

    return result;
  }

  async _resolveTargetEmployees(employeeIds = [], departmentIds = []) {
    const employeeRepo = AppDataSource.getRepository(EmployeeEntity);

    const explicitIds = this._toNumberArray(employeeIds);
    const deptIds = this._toNumberArray(departmentIds);

    const byId = new Map();

    // Priority: if specific employees are selected, use only those (ignore departmentIds)
    if (explicitIds.length > 0) {
      const rows = await employeeRepo
        .createQueryBuilder('employee')
        .where('employee.id IN (:...ids)', { ids: explicitIds })
        .andWhere('employee.isDeleted = :isDeleted', { isDeleted: false })
        .getMany();
      rows.forEach((row) => byId.set(row.id, row));
    } else if (deptIds.length > 0) {
      // Only use departmentIds if no specific employees were selected
      const rows = await employeeRepo
        .createQueryBuilder('employee')
        .where('employee.departmentId IN (:...deptIds)', { deptIds })
        .andWhere('employee.isDeleted = :isDeleted', { isDeleted: false })
        .getMany();
      rows.forEach((row) => byId.set(row.id, row));
    }

    const filtered = [...byId.values()].filter(
      (emp) => emp.employmentStatus !== EmployeeStatus.ON_LEAVE,
    );

    // Extract unique department IDs from selected employees
    const extractedDeptIds = [
      ...new Set(
        filtered
          .filter((emp) => emp.departmentId)
          .map((emp) => emp.departmentId),
      ),
    ];

    return {
      employeeIds: filtered.map((emp) => emp.id),
      employees: filtered,
      departmentIds: extractedDeptIds,
    };
  }

  async _loadLookupMaps(employeeIds = [], departmentIds = [], shiftIds = []) {
    const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
    const departmentRepo = AppDataSource.getRepository(DepartmentEntity);
    const shiftRepo = AppDataSource.getRepository(WorkingShiftEntity);

    const empIds = this._toNumberArray(employeeIds);
    const deptIds = this._toNumberArray(departmentIds);
    const shIds = this._toNumberArray(shiftIds);

    const [employees, departments, shifts] = await Promise.all([
      empIds.length
        ? employeeRepo
            .createQueryBuilder('employee')
            .where('employee.id IN (:...ids)', { ids: empIds })
            .andWhere('employee.isDeleted = :isDeleted', { isDeleted: false })
            .getMany()
        : Promise.resolve([]),
      deptIds.length
        ? departmentRepo
            .createQueryBuilder('department')
            .where('department.id IN (:...ids)', { ids: deptIds })
            .andWhere('department.isDeleted = :isDeleted', { isDeleted: false })
            .getMany()
        : Promise.resolve([]),
      shIds.length
        ? shiftRepo
            .createQueryBuilder('shift')
            .where('shift.id IN (:...ids)', { ids: shIds })
            .andWhere('shift.isDeleted = :isDeleted', { isDeleted: false })
            .getMany()
        : Promise.resolve([]),
    ]);

    return {
      employeeMap: new Map(employees.map((e) => [e.id, e.fullName])),
      departmentMap: new Map(departments.map((d) => [d.id, d.departmentName])),
      shiftMap: new Map(shifts.map((s) => [s.id, s.shiftName])),
    };
  }

  async _rebuildSchedulesForAssignment(assignment, payload) {
    const target = await this._resolveTargetEmployees(
      payload.employeeIds,
      payload.departmentIds,
    );

    if (target.employeeIds.length === 0) {
      return [];
    }

    const shiftIds = this._toNumberArray(payload.shiftIds, [payload.shiftId]);
    const weekdays = this._toNumberArray(payload.weekdays);
    const workDates = this._generateDates(
      payload.startDate,
      payload.endDate,
      weekdays,
      payload.repeatType,
    );

    if (workDates.length === 0 || shiftIds.length === 0) {
      return [];
    }

    const rows = this._buildScheduleRows(target.employees, shiftIds, workDates);

    await this._assertNoDuplicateSchedules(rows, assignment.id);

    await this.scheduleRepo.softDeleteByAssignmentId(assignment.id);

    const rowsWithAssignmentId = rows.map((row) => ({
      ...row,
      assignmentId: assignment.id,
    }));

    return this.scheduleRepo.bulkCreate(rowsWithAssignmentId);
  }

  _buildScheduleRowsForPayload(targetEmployees = [], shiftIds = [], payload = {}) {
    const normalizedShiftIds = this._toNumberArray(payload.shiftIds, shiftIds);
    const normalizedWeekdays = this._toNumberArray(payload.weekdays);
    const workDates = this._generateDates(
      payload.startDate,
      payload.endDate,
      normalizedWeekdays,
      payload.repeatType,
    );

    return this._buildScheduleRows(targetEmployees, normalizedShiftIds, workDates);
  }

  _buildScheduleRows(employees = [], shiftIds = [], workDates = []) {
    const rows = [];
    for (const emp of employees) {
      for (const workDate of workDates) {
        for (const shiftId of shiftIds) {
          rows.push({
            employeeId: emp.id,
            departmentId: emp.departmentId || null,
            shiftId,
            workDate,
          });
        }
      }
    }

    return rows;
  }

  async _assertNoDuplicateSchedules(rows = [], excludeAssignmentId = null) {
    if (!rows || rows.length === 0) {
      return;
    }

    const conflict = await this.scheduleRepo.findFirstConflict(
      rows,
      excludeAssignmentId,
    );

    if (!conflict) {
      return;
    }

    const employeeName =
      conflict.employee?.fullName || `ID ${conflict.employeeId}`;
    const shiftName = conflict.shift?.shiftName || `ID ${conflict.shiftId}`;

    throw new ConflictException(
      `Nhân viên ${employeeName} đã có ca ${shiftName} trùng thời gian vào ngày ${this._dateOnly(conflict.workDate)}`,
    );
  }

  async createAssignment(data) {
    const {
      assignmentName,
      employeeIds,
      departmentIds,
      shiftIds,
      shiftId,
      startDate,
      endDate,
      weekdays,
      repeatType,
    } = data;

    const normalizedShiftIds = this._toNumberArray(
      shiftIds,
      shiftId ? [shiftId] : [],
    );

    if (!assignmentName || !String(assignmentName).trim()) {
      throw new BadRequestException('Tên bản phân ca không được để trống');
    }

    const normalizedAssignmentName = String(assignmentName).trim();

    if (normalizedShiftIds.length === 0) {
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

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('startDate phải nhỏ hơn hoặc bằng endDate');
    }

    this._assertStartDateNotInPast(
      startDate,
      'Không thể tạo phân ca cho ngày trong quá khứ',
    );

    const normalizedWeekdays = this._toNumberArray(weekdays);
    if (
      (repeatType === 'weekly' || repeatType === '2weeks') &&
      normalizedWeekdays.length === 0
    ) {
      throw new BadRequestException(
        'Khi sử dụng repeatType weekly hoặc 2weeks phải cung cấp weekdays',
      );
    }

    const target = await this._resolveTargetEmployees(
      employeeIds,
      departmentIds,
    );
    if (target.employeeIds.length === 0) {
      throw new BadRequestException(
        'Không tìm thấy nhân viên phù hợp để tạo lịch phân ca',
      );
    }

    const scheduleRows = this._buildScheduleRowsForPayload(
      target.employees,
      normalizedShiftIds,
      {
        shiftIds: normalizedShiftIds,
        startDate,
        endDate,
        weekdays: normalizedWeekdays,
        repeatType: repeatType || 'weekly',
      },
    );

    await this._assertNoDuplicateSchedules(scheduleRows);

    const assignment = await this.assignRepo.create({
      assignmentName: normalizedAssignmentName,
      employeeId: target.employeeIds[0] || null,
      departmentId: target.departmentIds[0] || null,
      employeeIds: target.employeeIds.join(','),
      departmentIds: target.departmentIds.join(','),
      shiftId: normalizedShiftIds[0],
      shiftIds: normalizedShiftIds.join(','),
      effectiveFrom: startDate,
      effectiveTo: endDate,
      weekdays: normalizedWeekdays.join(','),
      repeatType: repeatType || 'weekly',
    });

    await this._rebuildSchedulesForAssignment(assignment, {
      employeeIds: target.employeeIds,
      departmentIds: target.departmentIds,
      shiftIds: normalizedShiftIds,
      startDate,
      endDate,
      weekdays: normalizedWeekdays,
      repeatType: repeatType || 'weekly',
    });

    return assignment;
  }

  async assignByDepartment(data) {
    return this.createAssignment(data);
  }

  async updateAssignment(id, data) {
    const existing = await this.assignRepo.findById(id);
    if (!existing) {
      throw new NotFoundException(
        AppMessages.Errors.ShiftAssignment.NOT_FOUND ||
          'Shift assignment not found',
      );
    }

    const currentEmployeeIds = this._toNumberArray(
      existing.employeeIds,
      existing.employeeId ? [existing.employeeId] : [],
    );
    const currentDepartmentIds = this._toNumberArray(
      existing.departmentIds,
      existing.departmentId ? [existing.departmentId] : [],
    );
    const currentShiftIds = this._toNumberArray(
      existing.shiftIds,
      existing.shiftId ? [existing.shiftId] : [],
    );
    const currentWeekdays = this._toNumberArray(existing.weekdays);

    const nextEmployeeIds =
      data.employeeIds && data.employeeIds.length > 0
        ? this._toNumberArray(data.employeeIds)
        : currentEmployeeIds;
    const nextDepartmentIds =
      data.departmentIds && data.departmentIds.length > 0
        ? this._toNumberArray(data.departmentIds)
        : currentDepartmentIds;
    const nextShiftIds =
      data.shiftIds && data.shiftIds.length > 0
        ? this._toNumberArray(data.shiftIds)
        : data.shiftId
          ? [Number(data.shiftId)]
          : currentShiftIds;
    const nextAssignmentName = data.assignmentName
      ? String(data.assignmentName).trim()
      : existing.assignmentName;
    const nextStartDate = data.startDate || existing.effectiveFrom;
    const nextEndDate = data.endDate || existing.effectiveTo;
    const nextWeekdays =
      data.weekdays && data.weekdays.length > 0
        ? this._toNumberArray(data.weekdays)
        : currentWeekdays;
    const nextRepeatType = data.repeatType || existing.repeatType || 'weekly';

    if (
      (!nextEmployeeIds || nextEmployeeIds.length === 0) &&
      (!nextDepartmentIds || nextDepartmentIds.length === 0)
    ) {
      throw new BadRequestException(
        'Phải cung cấp danh sách employeeIds hoặc departmentIds',
      );
    }

    if (!nextShiftIds || nextShiftIds.length === 0) {
      throw new BadRequestException('Phải cung cấp ít nhất một ca làm việc');
    }

    if (!nextAssignmentName || !String(nextAssignmentName).trim()) {
      throw new BadRequestException('Tên bản phân ca không được để trống');
    }

    if (
      nextStartDate &&
      nextEndDate &&
      new Date(nextStartDate) > new Date(nextEndDate)
    ) {
      throw new BadRequestException('startDate phải nhỏ hơn hoặc bằng endDate');
    }

    if (data.startDate) {
      this._assertStartDateNotInPast(
        data.startDate,
        'Không thể cập nhật phân ca với ngày bắt đầu trong quá khứ',
      );
    }

    if (
      (nextRepeatType === 'weekly' || nextRepeatType === '2weeks') &&
      nextWeekdays.length === 0
    ) {
      throw new BadRequestException(
        'Khi sử dụng repeatType weekly hoặc 2weeks phải cung cấp weekdays',
      );
    }

    const target = await this._resolveTargetEmployees(
      nextEmployeeIds,
      nextDepartmentIds,
    );

    if (target.employeeIds.length === 0) {
      throw new BadRequestException(
        'Không tìm thấy nhân viên phù hợp để cập nhật lịch phân ca',
      );
    }

    const scheduleRows = this._buildScheduleRowsForPayload(
      target.employees,
      nextShiftIds,
      {
        shiftIds: nextShiftIds,
        startDate: nextStartDate,
        endDate: nextEndDate,
        weekdays: nextWeekdays,
        repeatType: nextRepeatType,
      },
    );

    await this._assertNoDuplicateSchedules(scheduleRows, id);

    const updated = await this.assignRepo.update(id, {
      assignmentName: nextAssignmentName,
      employeeId: target.employeeIds[0] || null,
      departmentId: target.departmentIds[0] || null,
      employeeIds: target.employeeIds.join(','),
      departmentIds: target.departmentIds.join(','),
      shiftId: nextShiftIds[0],
      shiftIds: nextShiftIds.join(','),
      effectiveFrom: nextStartDate,
      effectiveTo: nextEndDate,
      weekdays: nextWeekdays.join(','),
      repeatType: nextRepeatType,
    });

    await this._rebuildSchedulesForAssignment(updated, {
      employeeIds: target.employeeIds,
      departmentIds: target.departmentIds,
      shiftIds: nextShiftIds,
      startDate: nextStartDate,
      endDate: nextEndDate,
      weekdays: nextWeekdays,
      repeatType: nextRepeatType,
    });

    return updated;
  }

  async cancelAssignment(id) {
    const existing = await this.assignRepo.findById(id);
    if (!existing) {
      throw new NotFoundException(
        AppMessages.Errors.ShiftAssignment.NOT_FOUND ||
          'Shift assignment not found',
      );
    }

    await this.assignRepo.softDelete(id);
    await this.scheduleRepo.softDeleteByAssignmentId(id);

    return { deletedCount: 1 };
  }

  async previewSchedule(data) {
    const { startDate, endDate, weekdays, repeatType, shiftIds, shiftId } =
      data;
    const ids = this._toNumberArray(shiftIds, shiftId ? [shiftId] : []);
    const normalizedWeekdays = this._toNumberArray(weekdays);
    const dates = this._generateDates(
      startDate,
      endDate,
      normalizedWeekdays,
      repeatType,
    );

    return dates.map((date) => ({
      date,
      shiftIds: ids,
    }));
  }

  async findAll(queryDto = {}) {
    const page = Number(queryDto.page || 1);
    const limit = Number(queryDto.limit || 10);

    const allAssignments = await this.assignRepo.findAllActive();

    const filtered = allAssignments.filter((item) => {
      const itemShiftIds = this._toNumberArray(
        item.shiftIds,
        item.shiftId ? [item.shiftId] : [],
      );
      const itemDepartmentIds = this._toNumberArray(
        item.departmentIds,
        item.departmentId ? [item.departmentId] : [],
      );

      if (
        queryDto.shiftId &&
        !itemShiftIds.includes(Number(queryDto.shiftId))
      ) {
        return false;
      }
      if (
        queryDto.departmentId &&
        !itemDepartmentIds.includes(Number(queryDto.departmentId))
      ) {
        return false;
      }

      if (queryDto.startDate || queryDto.endDate) {
        const from = item.effectiveFrom ? new Date(item.effectiveFrom) : null;
        const to = item.effectiveTo ? new Date(item.effectiveTo) : null;
        const qFrom = queryDto.startDate ? new Date(queryDto.startDate) : null;
        const qTo = queryDto.endDate ? new Date(queryDto.endDate) : null;
        if (!this._rangesOverlap(from, to, qFrom, qTo)) {
          return false;
        }
      }

      return true;
    });

    const employeeIds = new Set();
    const departmentIds = new Set();
    const shiftIds = new Set();

    filtered.forEach((item) => {
      this._toNumberArray(
        item.employeeIds,
        item.employeeId ? [item.employeeId] : [],
      ).forEach((id) => employeeIds.add(id));
      this._toNumberArray(
        item.departmentIds,
        item.departmentId ? [item.departmentId] : [],
      ).forEach((id) => departmentIds.add(id));
      this._toNumberArray(
        item.shiftIds,
        item.shiftId ? [item.shiftId] : [],
      ).forEach((id) => shiftIds.add(id));
    });

    const maps = await this._loadLookupMaps(
      [...employeeIds],
      [...departmentIds],
      [...shiftIds],
    );

    const searchValue = (queryDto.search || queryDto.keyword || '')
      .trim()
      .toLowerCase();

    const transformed = filtered
      .map((item) => {
        const itemEmployeeIds = this._toNumberArray(
          item.employeeIds,
          item.employeeId ? [item.employeeId] : [],
        );
        const itemDepartmentIds = this._toNumberArray(
          item.departmentIds,
          item.departmentId ? [item.departmentId] : [],
        );
        const itemShiftIds = this._toNumberArray(
          item.shiftIds,
          item.shiftId ? [item.shiftId] : [],
        );

        const employeeNames = itemEmployeeIds
          .map((id) => maps.employeeMap.get(id))
          .filter(Boolean);
        const departmentNames = itemDepartmentIds
          .map((id) => maps.departmentMap.get(id))
          .filter(Boolean);
        const shiftNames = itemShiftIds
          .map((id) => maps.shiftMap.get(id))
          .filter(Boolean);

        return {
          id: item.id,
          assignmentName: item.assignmentName || `Bảng phân ca #${item.id}`,
          effectiveFrom: this._dateOnly(item.effectiveFrom),
          effectiveTo: this._dateOnly(item.effectiveTo),
          weekdays: this._toNumberArray(item.weekdays),
          repeatType: item.repeatType || 'weekly',
          shiftIds: itemShiftIds,
          shiftNames,
          employeeIds: itemEmployeeIds,
          employeeNames,
          departmentIds: itemDepartmentIds,
          departmentNames,
          appliedShifts: shiftNames.join(', '),
          appliedDepartments:
            departmentNames.length > 0
              ? `${departmentNames.length} Phòng ban`
              : 'Tất cả phòng ban',
          appliedTargets:
            employeeNames.length > 0
              ? `${employeeNames.length} Nhân viên`
              : 'Theo phòng ban',
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      })
      .filter((item) => {
        if (!searchValue) return true;
        const searchable = [
          item.assignmentName,
          ...item.shiftNames,
          ...item.departmentNames,
          ...item.employeeNames,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return searchable.includes(searchValue);
      })
      .sort((a, b) => b.id - a.id);

    const totalItems = transformed.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const startIndex = (safePage - 1) * limit;

    return {
      items: transformed.slice(startIndex, startIndex + limit),
      totalItems,
      totalPages,
      page: safePage,
      limit,
    };
  }

  async getSchedules(query) {
    const { startDate, endDate, departmentId, shiftId, keyword } = query;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('startDate phải nhỏ hơn hoặc bằng endDate');
    }

    const rows = await this.scheduleRepo.findAll({
      startDate,
      endDate,
      departmentId,
      shiftId,
      keyword,
    });

    return rows.map((row) => ({
      ...row,
      date: this._dateOnly(row.workDate),
      effectiveFrom: row.assignment?.effectiveFrom || null,
      effectiveTo: row.assignment?.effectiveTo || null,
    }));
  }

  async getEmployeeSchedule(employeeId, startDate, endDate, userContext) {
    await this._assertCanViewEmployeeSchedule(employeeId, userContext);

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('startDate phải nhỏ hơn hoặc bằng endDate');
    }

    const rows = await this.scheduleRepo.findAll({
      employeeId,
      startDate,
      endDate,
    });

    if (rows.length === 0) {
      const legacyAssignments = await this.assignRepo.findAllActive({
        employeeId,
      });
      if (legacyAssignments.length > 0) {
        return this._expandLegacyEmployeeAssignments(
          legacyAssignments,
          employeeId,
          startDate,
          endDate,
        );
      }
    }

    return rows.map((row) => ({
      ...row,
      date: this._dateOnly(row.workDate),
      effectiveFrom: row.assignment?.effectiveFrom || null,
      effectiveTo: row.assignment?.effectiveTo || null,
    }));
  }

  _isEmployeeOnly(userContext) {
    const roles = userContext?.roles || [];
    return (
      roles.includes('EMPLOYEE') &&
      !roles.includes('ADMIN') &&
      !roles.includes('HR')
    );
  }

  async _getEmployeeByUserId(userId) {
    if (!userId) return null;
    return AppDataSource.getRepository(EmployeeEntity).findOne({
      where: { userId, isDeleted: false },
      select: ['id'],
    });
  }

  async _assertCanViewEmployeeSchedule(employeeId, userContext) {
    if (!this._isEmployeeOnly(userContext)) {
      return;
    }

    const employee = await this._getEmployeeByUserId(userContext.id);
    if (!employee || employee.id !== employeeId) {
      throw new ForbiddenException(
        'Bạn không có quyền xem lịch của nhân viên này',
      );
    }
  }

  async getDepartmentSchedule(departmentId, startDate, endDate) {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('startDate phải nhỏ hơn hoặc bằng endDate');
    }

    const rows = await this.scheduleRepo.findAll({
      departmentId,
      startDate,
      endDate,
    });

    return rows.map((row) => ({
      ...row,
      date: this._dateOnly(row.workDate),
      effectiveFrom: row.assignment?.effectiveFrom || null,
      effectiveTo: row.assignment?.effectiveTo || null,
    }));
  }
}
