import { ShiftAssignmentsService } from '../shift-assignments.service.js';
import { ShiftAssignmentsRepository } from '../../repositories/shift-assignments.repository.js';
import { ShiftSchedulesRepository } from '../../repositories/shift-schedules.repository.js';
import { AttendanceRepository } from '../../repositories/attendances.repository.js';

jest.mock('../../repositories/shift-assignments.repository.js', () => ({
  ShiftAssignmentsRepository: jest.fn(),
}));

jest.mock('../../repositories/shift-schedules.repository.js', () => ({
  ShiftSchedulesRepository: jest.fn(),
}));

jest.mock('../../repositories/attendances.repository.js', () => ({
  AttendanceRepository: jest.fn(),
}));

describe('ShiftAssignmentsService', () => {
  let service;
  let assignRepo;
  let scheduleRepo;
  let attendanceRepo;

  const makeFutureDate = (daysOffset) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    assignRepo = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      softDelete: jest.fn(),
      findAllActive: jest.fn(),
    };

    scheduleRepo = {
      bulkCreate: jest.fn(),
      softDeleteByAssignmentId: jest.fn(),
      findAll: jest.fn(),
      findFirstConflict: jest.fn(),
    };

    attendanceRepo = {
      countByAssignmentId: jest.fn(),
    };

    ShiftAssignmentsRepository.mockImplementation(() => assignRepo);
    ShiftSchedulesRepository.mockImplementation(() => scheduleRepo);
    AttendanceRepository.mockImplementation(() => attendanceRepo);

    service = new ShiftAssignmentsService();
    jest.spyOn(service, '_assertNotLockedPeriods').mockResolvedValue();
    jest.spyOn(service, '_recalculateTimesheetsForRange').mockResolvedValue();
    jest.spyOn(service, '_notifyEmployeesForAssignment').mockResolvedValue();
  });

  const expectRejectWithStatus = async (promise, statusCode) => {
    try {
      await promise;
      throw new Error('Expected promise to reject');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.statusCode).toBe(statusCode);
    }
  };

  it('rejects createAssignment when assignmentName is empty', async () => {
    await expectRejectWithStatus(
      service.createAssignment({
        assignmentName: '   ',
        employeeIds: [1],
        shiftIds: [2],
        startDate: '2026-03-01',
        endDate: '2026-03-31',
      }),
      400,
    );
  });

  it('rejects createAssignment when startDate is in the past', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday.getFullYear();
    const m = String(yesterday.getMonth() + 1).padStart(2, '0');
    const d = String(yesterday.getDate()).padStart(2, '0');
    const pastDate = `${y}-${m}-${d}`;

    await expectRejectWithStatus(
      service.createAssignment({
        assignmentName: 'Ca sáng',
        employeeIds: [1],
        shiftIds: [2],
        startDate: pastDate,
        endDate: pastDate,
        weekdays: [1],
        repeatType: 'weekly',
      }),
      400,
    );
  });

  it('creates assignment and rebuilds schedules with normalized payload', async () => {
    jest.spyOn(service, '_resolveTargetEmployees').mockResolvedValue({
      employeeIds: [1, 2],
      employees: [{ id: 1 }, { id: 2 }],
      departmentIds: [8],
    });
    const rebuildSpy = jest
      .spyOn(service, '_rebuildSchedulesForAssignment')
      .mockResolvedValue([{ id: 10 }]);

    assignRepo.create.mockResolvedValue({ id: 99, assignmentName: 'Ca A' });
    const startDate = makeFutureDate(7);
    const endDate = makeFutureDate(21);

    const result = await service.createAssignment({
      assignmentName: '  Ca A  ',
      employeeIds: ['1', '2'],
      departmentIds: ['8'],
      shiftIds: ['3', '4'],
      weekdays: ['1', '3'],
      repeatType: 'weekly',
      startDate,
      endDate,
    });

    expect(assignRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        assignmentName: 'Ca A',
        employeeIds: '1,2',
        departmentIds: '8',
        shiftIds: '3,4',
        shiftId: 3,
        weekdays: '1,3',
        repeatType: 'weekly',
      }),
    );
    expect(rebuildSpy).toHaveBeenCalledWith(
      { id: 99, assignmentName: 'Ca A' },
      expect.objectContaining({
        employeeIds: [1, 2],
        departmentIds: [8],
        shiftIds: [3, 4],
        weekdays: [1, 3],
      }),
    );
    expect(result).toEqual({ id: 99, assignmentName: 'Ca A' });
  });

  it('throws NotFound behavior when updateAssignment target does not exist', async () => {
    assignRepo.findById.mockResolvedValue(null);

    await expectRejectWithStatus(service.updateAssignment(404, {}), 404);
  });

  it('updates assignment and rebuilds schedules from merged data', async () => {
    assignRepo.findById.mockResolvedValue({
      id: 5,
      assignmentName: 'Old',
      employeeId: 11,
      employeeIds: '11',
      departmentIds: '20',
      shiftId: 7,
      shiftIds: '7',
      weekdays: '1,3',
      repeatType: 'weekly',
      effectiveFrom: makeFutureDate(7),
      effectiveTo: makeFutureDate(21),
    });

    jest.spyOn(service, '_resolveTargetEmployees').mockResolvedValue({
      employeeIds: [12],
      employees: [{ id: 12, departmentId: 20 }],
      departmentIds: [20],
    });

    const rebuildSpy = jest
      .spyOn(service, '_rebuildSchedulesForAssignment')
      .mockResolvedValue([]);

    assignRepo.update.mockResolvedValue({ id: 5, assignmentName: 'New Name' });

    const result = await service.updateAssignment(5, {
      assignmentName: 'New Name',
      shiftIds: [9],
      weekdays: [2, 4],
    });

    expect(assignRepo.update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({
        assignmentName: 'New Name',
        employeeIds: '12',
        departmentIds: '20',
        shiftIds: '9',
        shiftId: 9,
        weekdays: '2,4',
      }),
    );
    expect(rebuildSpy).toHaveBeenCalled();
    expect(result).toEqual({ id: 5, assignmentName: 'New Name' });
  });

  it('rejects updateAssignment when generated schedules conflict with existing rows', async () => {
    assignRepo.findById.mockResolvedValue({
      id: 6,
      assignmentName: 'Old',
      employeeId: 11,
      employeeIds: '11',
      departmentIds: '20',
      shiftId: 7,
      shiftIds: '7',
      weekdays: '1,3',
      repeatType: 'weekly',
      effectiveFrom: makeFutureDate(7),
      effectiveTo: makeFutureDate(21),
    });

    jest.spyOn(service, '_resolveTargetEmployees').mockResolvedValue({
      employeeIds: [11],
      employees: [{ id: 11, departmentId: 20 }],
      departmentIds: [20],
    });

    scheduleRepo.findFirstConflict.mockResolvedValue({
      employeeId: 11,
      shiftId: 9,
      workDate: makeFutureDate(10),
    });

    await expectRejectWithStatus(
      service.updateAssignment(6, {
        shiftIds: [9],
        weekdays: [2],
        startDate: makeFutureDate(7),
        endDate: makeFutureDate(21),
      }),
      409,
    );

    expect(assignRepo.update).not.toHaveBeenCalled();
  });

  it('rejects updateAssignment when assignment already belongs to the past', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday.getFullYear();
    const m = String(yesterday.getMonth() + 1).padStart(2, '0');
    const d = String(yesterday.getDate()).padStart(2, '0');
    const pastDate = `${y}-${m}-${d}`;

    assignRepo.findById.mockResolvedValue({
      id: 8,
      assignmentName: 'Old',
      employeeId: 11,
      employeeIds: '11',
      departmentIds: '20',
      shiftId: 7,
      shiftIds: '7',
      weekdays: '1,3',
      repeatType: 'weekly',
      effectiveFrom: pastDate,
      effectiveTo: makeFutureDate(7),
    });

    await expectRejectWithStatus(
      service.updateAssignment(8, { assignmentName: 'New Name' }),
      400,
    );

    expect(assignRepo.update).not.toHaveBeenCalled();
  });

  it('rejects updateAssignment when provided startDate is in the past', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday.getFullYear();
    const m = String(yesterday.getMonth() + 1).padStart(2, '0');
    const d = String(yesterday.getDate()).padStart(2, '0');
    const pastDate = `${y}-${m}-${d}`;

    assignRepo.findById.mockResolvedValue({
      id: 5,
      assignmentName: 'Old',
      employeeId: 11,
      employeeIds: '11',
      departmentIds: '20',
      shiftId: 7,
      shiftIds: '7',
      weekdays: '1,3',
      repeatType: 'weekly',
      effectiveFrom: makeFutureDate(7),
      effectiveTo: makeFutureDate(21),
    });

    await expectRejectWithStatus(
      service.updateAssignment(5, { startDate: pastDate }),
      400,
    );

    expect(assignRepo.update).not.toHaveBeenCalled();
  });

  it('cancels assignment and soft deletes generated schedules', async () => {
    assignRepo.findById.mockResolvedValue({ id: 77 });
    assignRepo.softDelete.mockResolvedValue({ affected: 1 });
    scheduleRepo.softDeleteByAssignmentId.mockResolvedValue({ affected: 5 });
    attendanceRepo.countByAssignmentId.mockResolvedValue(0);

    const result = await service.cancelAssignment(77);

    expect(assignRepo.softDelete).toHaveBeenCalledWith(77);
    expect(scheduleRepo.softDeleteByAssignmentId).toHaveBeenCalledWith(77);
    expect(result).toEqual({ deletedCount: 1 });
  });

  it('rejects cancelAssignment when attendance has already been generated', async () => {
    assignRepo.findById.mockResolvedValue({
      id: 78,
      effectiveFrom: makeFutureDate(1),
      effectiveTo: makeFutureDate(10),
      employeeIds: '1',
      employeeId: 1,
    });
    attendanceRepo.countByAssignmentId.mockResolvedValue(2);

    await expectRejectWithStatus(service.cancelAssignment(78), 409);

    expect(assignRepo.softDelete).not.toHaveBeenCalled();
    expect(scheduleRepo.softDeleteByAssignmentId).not.toHaveBeenCalled();
  });

  it('maps schedule rows and normalizes output date in getSchedules', async () => {
    scheduleRepo.findAll.mockResolvedValue([
      {
        id: 1,
        workDate: '2026-03-20',
        assignment: {
          effectiveFrom: '2026-03-01',
          effectiveTo: '2026-03-31',
        },
      },
    ]);

    const result = await service.getSchedules({
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      departmentId: 1,
      shiftId: 2,
      keyword: 'An',
    });

    expect(scheduleRepo.findAll).toHaveBeenCalledWith({
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      departmentId: 1,
      shiftId: 2,
      keyword: 'An',
    });
    expect(result[0]).toEqual(
      expect.objectContaining({
        date: '2026-03-20',
        effectiveFrom: '2026-03-01',
        effectiveTo: '2026-03-31',
      }),
    );
  });

  it('returns legacy expanded assignments when no schedule rows exist', async () => {
    scheduleRepo.findAll.mockResolvedValue([]);
    assignRepo.findAllActive.mockResolvedValue([{ id: 15 }]);
    jest
      .spyOn(service, '_assertCanViewEmployeeSchedule')
      .mockResolvedValue(undefined);
    const expandSpy = jest
      .spyOn(service, '_expandLegacyEmployeeAssignments')
      .mockReturnValue([{ id: 'legacy-1', date: '2026-03-10' }]);

    const result = await service.getEmployeeSchedule(
      5,
      '2026-03-01',
      '2026-03-31',
      { roles: ['ADMIN'] },
    );

    expect(assignRepo.findAllActive).toHaveBeenCalledWith({ employeeId: 5 });
    expect(expandSpy).toHaveBeenCalled();
    expect(result).toEqual([{ id: 'legacy-1', date: '2026-03-10' }]);
  });

  it('blocks employee user from viewing another employee schedule', async () => {
    jest.spyOn(service, '_getEmployeeByUserId').mockResolvedValue({ id: 10 });

    await expectRejectWithStatus(
      service.getEmployeeSchedule(11, '2026-03-01', '2026-03-31', {
        id: 999,
        roles: ['EMPLOYEE'],
      }),
      403,
    );
  });

  it('rejects createAssignment when generated schedules conflict with existing rows', async () => {
    jest.spyOn(service, '_resolveTargetEmployees').mockResolvedValue({
      employeeIds: [1],
      employees: [{ id: 1, departmentId: 2 }],
      departmentIds: [2],
    });
    scheduleRepo.findFirstConflict.mockResolvedValue({
      employeeId: 1,
      shiftId: 3,
      workDate: '2026-03-03',
    });

    await expectRejectWithStatus(
      service.createAssignment({
        assignmentName: 'Ca sáng',
        employeeIds: [1],
        shiftIds: [3],
        weekdays: [2],
        repeatType: 'weekly',
        startDate: makeFutureDate(7),
        endDate: makeFutureDate(21),
      }),
      409,
    );

    expect(assignRepo.create).not.toHaveBeenCalled();
  });

  describe('Create & Update Shift Assignment - Specified validation and success messages', () => {
    const MockSvc = function () {
      this.createAssignment = jest.fn(async (payload) => {
        const { employeeIds, departmentIds, shiftIds, startDate, endDate } =
          payload || {};
        if (
          (!employeeIds || employeeIds.length === 0) &&
          (!departmentIds || departmentIds.length === 0)
        ) {
          const err = new Error('Phải chọn nhân viên hoặc phòng ban');
          err.statusCode = 400;
          throw err;
        }
        if (!shiftIds || shiftIds.length === 0) {
          const err = new Error('Vui lòng chọn ít nhất một ca làm việc');
          err.statusCode = 400;
          throw err;
        }
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
          const err = new Error(
            'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc',
          );
          err.statusCode = 400;
          throw err;
        }

        return {
          success: true,
          message: 'Phân ca thành công',
          statusCode: 200,
        };
      });

      this.updateAssignment = jest.fn(async (id, payload) => {
        const { employeeIds, departmentIds, shiftIds, startDate, endDate } =
          payload || {};
        if (
          (!employeeIds || employeeIds.length === 0) &&
          (!departmentIds || departmentIds.length === 0)
        ) {
          const err = new Error('Phải chọn nhân viên hoặc phòng ban');
          err.statusCode = 400;
          throw err;
        }
        if (!shiftIds || shiftIds.length === 0) {
          const err = new Error('Vui lòng chọn ít nhất một ca làm việc');
          err.statusCode = 400;
          throw err;
        }
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
          const err = new Error(
            'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc',
          );
          err.statusCode = 400;
          throw err;
        }
        return {
          success: true,
          message: 'Cập nhật phân ca thành công',
          statusCode: 200,
        };
      });
    };

    let mockSvc;

    beforeEach(() => {
      mockSvc = new MockSvc();
    });

    describe('Create Shift Assignment - success cases', () => {
      test('Phân ca thành công', async () => {
        const payload = {
          assignmentName: 'Ca ot ngày thường',
          employeeIds: [4, 7, 5, 6, 3, 2, 10, 8, 9, 1],
          departmentIds: [12, 11, 13, 2, 1, 10],
          shiftIds: [3],
          startDate: '2026-04-01',
          endDate: '2026-04-30',
          weekdays: [1, 3, 5],
          repeatType: '2weeks',
        };

        const res = await mockSvc.createAssignment(payload);
        expect(res).toEqual({
          success: true,
          message: 'Phân ca thành công',
          statusCode: 200,
        });
      });
    });

    describe('Create Shift Assignment - validation cases', () => {
      test('Không cho phân ca khi không chọn nhân viên và phòng ban', async () => {
        await expect(
          mockSvc.createAssignment({
            employeeIds: [],
            departmentIds: [],
            shiftIds: [1],
          }),
        ).rejects.toMatchObject({
          message: 'Phải chọn nhân viên hoặc phòng ban',
          statusCode: 400,
        });
      });

      test('Không cho phân ca khi không chọn ca làm việc', async () => {
        await expect(
          mockSvc.createAssignment({
            employeeIds: [1],
            departmentIds: [],
            shiftIds: [],
          }),
        ).rejects.toMatchObject({
          message: 'Vui lòng chọn ít nhất một ca làm việc',
          statusCode: 400,
        });
      });
    });

    describe('Create Shift Assignment - invalid date cases', () => {
      test('Không cho phân ca khi ngày bắt đầu lớn hơn ngày kết thúc', async () => {
        await expect(
          mockSvc.createAssignment({
            employeeIds: [1],
            departmentIds: [],
            shiftIds: [2],
            startDate: '2026-04-01',
            endDate: '2026-03-30',
          }),
        ).rejects.toMatchObject({
          message: 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc',
          statusCode: 400,
        });
      });
    });

    describe('Update Shift Assignment - success cases', () => {
      test('Cập nhật phân ca thành công', async () => {
        const payload = {
          assignmentName: 'Ca ot ngày thường',
          employeeIds: [4, 7, 5, 6, 3, 2, 10, 8, 9, 1],
          departmentIds: [12, 11, 13, 2, 1, 10],
          shiftIds: [3],
          startDate: '2026-04-01',
          endDate: '2026-04-30',
          weekdays: [1, 3, 5],
          repeatType: '2weeks',
        };

        const res = await mockSvc.updateAssignment(1, payload);
        expect(res).toEqual({
          success: true,
          message: 'Cập nhật phân ca thành công',
          statusCode: 200,
        });
      });
    });

    describe('Update Shift Assignment - validation cases', () => {
      test('Không cho cập nhật phân ca khi không chọn nhân viên và phòng ban', async () => {
        await expect(
          mockSvc.updateAssignment(5, {
            employeeIds: [],
            departmentIds: [],
            shiftIds: [1],
          }),
        ).rejects.toMatchObject({
          message: 'Phải chọn nhân viên hoặc phòng ban',
          statusCode: 400,
        });
      });

      test('Không cho cập nhật phân ca khi không chọn ca làm việc', async () => {
        await expect(
          mockSvc.updateAssignment(5, {
            employeeIds: [1],
            departmentIds: [],
            shiftIds: [],
          }),
        ).rejects.toMatchObject({
          message: 'Vui lòng chọn ít nhất một ca làm việc',
          statusCode: 400,
        });
      });
    });

    describe('Update Shift Assignment - invalid date cases', () => {
      test('Không cho cập nhật phân ca khi ngày bắt đầu lớn hơn ngày kết thúc', async () => {
        await expect(
          mockSvc.updateAssignment(5, {
            employeeIds: [1],
            departmentIds: [],
            shiftIds: [2],
            startDate: '2026-04-01',
            endDate: '2026-03-30',
          }),
        ).rejects.toMatchObject({
          message: 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc',
          statusCode: 400,
        });
      });
    });
  });
});
