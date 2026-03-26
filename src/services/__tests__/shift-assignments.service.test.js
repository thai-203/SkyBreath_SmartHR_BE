import { ShiftAssignmentsService } from '../shift-assignments.service.js';
import { ShiftAssignmentsRepository } from '../../repositories/shift-assignments.repository.js';
import { ShiftSchedulesRepository } from '../../repositories/shift-schedules.repository.js';

jest.mock('../../repositories/shift-assignments.repository.js', () => ({
  ShiftAssignmentsRepository: jest.fn(),
}));

jest.mock('../../repositories/shift-schedules.repository.js', () => ({
  ShiftSchedulesRepository: jest.fn(),
}));

describe('ShiftAssignmentsService', () => {
  let service;
  let assignRepo;
  let scheduleRepo;

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

    ShiftAssignmentsRepository.mockImplementation(() => assignRepo);
    ShiftSchedulesRepository.mockImplementation(() => scheduleRepo);

    service = new ShiftAssignmentsService();
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

    const result = await service.createAssignment({
      assignmentName: '  Ca A  ',
      employeeIds: ['1', '2'],
      departmentIds: ['8'],
      shiftIds: ['3', '4'],
      weekdays: ['1', '3'],
      repeatType: 'weekly',
      startDate: '2026-03-01',
      endDate: '2026-03-31',
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
      effectiveFrom: '2026-03-01',
      effectiveTo: '2026-03-31',
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
      effectiveFrom: '2026-03-01',
      effectiveTo: '2026-03-31',
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

    const result = await service.cancelAssignment(77);

    expect(assignRepo.softDelete).toHaveBeenCalledWith(77);
    expect(scheduleRepo.softDeleteByAssignmentId).toHaveBeenCalledWith(77);
    expect(result).toEqual({ deletedCount: 1 });
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
        startDate: '2026-03-01',
        endDate: '2026-03-31',
      }),
      409,
    );

    expect(assignRepo.create).not.toHaveBeenCalled();
  });
});
