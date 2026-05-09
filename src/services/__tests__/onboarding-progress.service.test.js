import 'reflect-metadata';
import { OnboardingProgressService } from '../onboarding-progress.service.js';
import { OnboardingProgressRepository } from '../../repositories/onboarding-progress.repository.js';
import { OnboardingPlansRepository } from '../../repositories/onboarding-plans.repository.js';
import { TaskAssignmentsRepository } from '../../repositories/task-assignments.repository.js';
import { EmployeesRepository } from '../../repositories/employees.repository.js';
import { ExcelUtil } from '../../common/utils/excel.util.js';

jest.mock('../../repositories/onboarding-progress.repository.js', () => ({
  OnboardingProgressRepository: jest.fn(),
}));

jest.mock('../../repositories/onboarding-plans.repository.js', () => ({
  OnboardingPlansRepository: jest.fn(),
}));

jest.mock('../../repositories/task-assignments.repository.js', () => ({
  TaskAssignmentsRepository: jest.fn(),
}));

jest.mock('../../repositories/employees.repository.js', () => ({
  EmployeesRepository: jest.fn(),
}));

jest.mock('../../common/utils/excel.util.js', () => ({
  ExcelUtil: {
    export: jest.fn(),
  },
}));

describe('OnboardingProgressService', () => {
  let service;
  let progressRepo;
  let plansRepo;
  let assignmentsRepo;
  let employeesRepo;

  const expectRejectWithStatus = async (promise, statusCode) => {
    try {
      await promise;
      throw new Error('Expected promise to reject');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.statusCode).toBe(statusCode);
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    progressRepo = {
      count: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmployeeId: jest.fn(),
      findByEmployeeAndPlan: jest.fn(),
      findInProgressByDepartment: jest.fn(),
      countByStatus: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    plansRepo = {
      findById: jest.fn(),
    };

    assignmentsRepo = {
      findByProgressId: jest.fn(),
    };

    employeesRepo = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      countByCreatedAtRange: jest.fn(),
    };

    OnboardingProgressRepository.mockImplementation(() => progressRepo);
    OnboardingPlansRepository.mockImplementation(() => plansRepo);
    TaskAssignmentsRepository.mockImplementation(() => assignmentsRepo);
    EmployeesRepository.mockImplementation(() => employeesRepo);

    service = new OnboardingProgressService();
  });

  it('computes OVERDUE display status when expected end date is in the past', () => {
    const result = service.getDisplayStatusMeta(
      {
        overallStatus: 'IN_PROGRESS',
        expectedEndDate: '2026-04-10',
      },
      new Date('2026-04-19T10:00:00.000Z'),
    );

    expect(result.displayStatus).toBe('OVERDUE');
    expect(result.isOverdue).toBe(true);
    expect(result.overdueDays).toBeGreaterThan(0);
  });

  it('keeps current status when the expected end date is in the future', () => {
    const result = service.getDisplayStatusMeta(
      {
        overallStatus: 'in_progress',
        expectedEndDate: '2026-04-30',
      },
      new Date('2026-04-19T10:00:00.000Z'),
    );

    expect(result).toEqual({
      isOverdue: false,
      overdueDays: 0,
      displayStatus: 'IN_PROGRESS',
    });
  });

  it('keeps COMPLETED status even when the expected end date is in the past', () => {
    const result = service.getDisplayStatusMeta(
      {
        overallStatus: 'COMPLETED',
        expectedEndDate: '2026-04-01',
      },
      new Date('2026-04-19T10:00:00.000Z'),
    );

    expect(result).toEqual({
      isOverdue: false,
      overdueDays: 0,
      displayStatus: 'COMPLETED',
    });
  });

  it('returns NOT_STARTED when status and expected end date are missing', () => {
    const result = service.getDisplayStatusMeta(
      {},
      new Date('2026-04-19T10:00:00.000Z'),
    );

    expect(result).toEqual({
      isOverdue: false,
      overdueDays: 0,
      displayStatus: 'NOT_STARTED',
    });
  });

  it('returns all records when page is 1 by using total count as limit', async () => {
    progressRepo.count.mockResolvedValue(2);
    progressRepo.findAll.mockResolvedValue([
      { id: 1, overallStatus: 'IN_PROGRESS', expectedEndDate: '2099-01-01' },
      { id: 2, overallStatus: 'COMPLETED', expectedEndDate: '2020-01-01' },
    ]);

    const query = { page: 1, limit: 1 };
    const result = await service.findAll(query);

    expect(query.limit).toBe(2);
    expect(progressRepo.findAll).toHaveBeenCalledWith(query);
    expect(result.data).toHaveLength(2);
  });

  it('throws BadRequestException when resuming progress not in ON_HOLD status', async () => {
    progressRepo.findById.mockResolvedValue({
      id: 20,
      overallStatus: 'IN_PROGRESS',
    });

    await expectRejectWithStatus(service.resume(20), 400);
  });

  it('throws NotFoundException when progress record does not exist', async () => {
    progressRepo.findById.mockResolvedValue(null);

    await expectRejectWithStatus(service.findById(999), 404);
  });

  it('throws NotFoundException when linked employee cannot be found', async () => {
    employeesRepo.findByUserId.mockResolvedValue(null);

    await expectRejectWithStatus(service.findOwnProgress(88), 404);
  });

  it('throws NotFoundException when employee-linked progress cannot be found', async () => {
    employeesRepo.findByUserId.mockResolvedValue({ id: 51 });
    progressRepo.findByEmployeeId.mockResolvedValue(null);

    await expectRejectWithStatus(service.findOwnProgress(51), 404);
  });

  it('updates progress percentage based on completed task assignments', async () => {
    progressRepo.findById.mockResolvedValue({
      id: 30,
      overallStatus: 'IN_PROGRESS',
    });
    assignmentsRepo.findByProgressId.mockResolvedValue([
      { status: 'COMPLETED' },
      { status: 'PENDING' },
      { status: 'COMPLETED' },
      { status: 'PENDING' },
    ]);
    progressRepo.update.mockResolvedValue({ id: 30, progressPercentage: 50 });

    const result = await service.updateProgressPercentage(30);

    expect(progressRepo.update).toHaveBeenCalledWith(
      30,
      expect.objectContaining({
        progressPercentage: 50,
        completedTasksCount: 2,
        totalTasksCount: 4,
      }),
    );
    expect(result).toEqual({ id: 30, progressPercentage: 50 });
  });

  it('returns current progress unchanged when there are no task assignments', async () => {
    progressRepo.findById.mockResolvedValue({
      id: 31,
      overallStatus: 'IN_PROGRESS',
    });
    assignmentsRepo.findByProgressId.mockResolvedValue([]);

    const result = await service.updateProgressPercentage(31);

    expect(progressRepo.update).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: 31,
      overallStatus: 'IN_PROGRESS',
    });
  });

  it('throws NotFoundException when creating progress for a missing plan', async () => {
    plansRepo.findById.mockResolvedValue(null);

    await expectRejectWithStatus(service.create(50, 41), 404);
  });

  it('throws BadRequestException when creating progress for a missing employee', async () => {
    plansRepo.findById.mockResolvedValue({
      id: 40,
      durationDays: 14,
      tasks: [],
    });
    employeesRepo.findById.mockResolvedValue(null);

    await expectRejectWithStatus(service.create(50, 40), 400);
  });

  it('throws BadRequestException when progress already exists for employee and plan', async () => {
    plansRepo.findById.mockResolvedValue({
      id: 40,
      durationDays: 14,
      tasks: [],
    });
    employeesRepo.findById.mockResolvedValue({ id: 50 });
    progressRepo.findByEmployeeAndPlan.mockResolvedValue({ id: 61 });

    await expectRejectWithStatus(service.create(50, 40), 400);
  });

  it('creates onboarding progress with calculated end date', async () => {
    plansRepo.findById.mockResolvedValue({
      id: 40,
      durationDays: 14,
      tasks: [{ id: 1 }, { id: 2 }],
    });
    employeesRepo.findById.mockResolvedValue({ id: 50 });
    progressRepo.findByEmployeeAndPlan.mockResolvedValue(null);
    progressRepo.create.mockResolvedValue({ id: 60 });

    const result = await service.create(50, 40, 77);

    expect(progressRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: 50,
        planId: 40,
        overallStatus: 'IN_PROGRESS',
        assignedMentorId: 77,
        totalTasksCount: 2,
      }),
    );
    expect(result).toEqual({ id: 60 });
  });

  it('returns overdue display data when fetching progress by id', async () => {
    progressRepo.findById.mockResolvedValue({
      id: 70,
      overallStatus: 'IN_PROGRESS',
      expectedEndDate: '2026-04-01T00:00:00.000Z',
    });

    const result = await service.findById(70);

    expect(result.displayStatus).toBe('OVERDUE');
    expect(result.isOverdue).toBe(true);
  });

  it('completes a progress record', async () => {
    progressRepo.findById.mockResolvedValue({
      id: 80,
      overallStatus: 'IN_PROGRESS',
    });
    progressRepo.update.mockResolvedValue({
      id: 80,
      overallStatus: 'COMPLETED',
    });

    const result = await service.complete(80);

    expect(progressRepo.update).toHaveBeenCalledWith(
      80,
      expect.objectContaining({
        overallStatus: 'COMPLETED',
        actualEndDate: expect.any(Date),
      }),
    );
    expect(result).toEqual({ id: 80, overallStatus: 'COMPLETED' });
  });

  it('resumes a paused progress record', async () => {
    progressRepo.findById.mockResolvedValue({
      id: 81,
      overallStatus: 'ON_HOLD',
    });
    progressRepo.update.mockResolvedValue({
      id: 81,
      overallStatus: 'IN_PROGRESS',
    });

    const result = await service.resume(81);

    expect(progressRepo.update).toHaveBeenCalledWith(
      81,
      expect.objectContaining({
        overallStatus: 'IN_PROGRESS',
      }),
    );
    expect(result).toEqual({ id: 81, overallStatus: 'IN_PROGRESS' });
  });

  it('pauses an active progress record', async () => {
    progressRepo.findById.mockResolvedValue({
      id: 82,
      overallStatus: 'IN_PROGRESS',
    });
    progressRepo.update.mockResolvedValue({
      id: 82,
      overallStatus: 'ON_HOLD',
    });

    const result = await service.pause(82);

    expect(progressRepo.update).toHaveBeenCalledWith(
      82,
      expect.objectContaining({
        overallStatus: 'ON_HOLD',
      }),
    );
    expect(result).toEqual({ id: 82, overallStatus: 'ON_HOLD' });
  });

  it('returns progress by department directly from repository', async () => {
    progressRepo.findInProgressByDepartment.mockResolvedValue([{ id: 91 }]);

    const result = await service.findByDepartment(3);

    expect(progressRepo.findInProgressByDepartment).toHaveBeenCalledWith(3);
    expect(result).toEqual([{ id: 91 }]);
  });

  it('computes statistics including growth rate from employee counts', async () => {
    progressRepo.count.mockResolvedValue(10);
    progressRepo.countByStatus
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);
    employeesRepo.countByCreatedAtRange
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(4);

    const result = await service.getStatistics();

    expect(progressRepo.countByStatus).toHaveBeenNthCalledWith(
      1,
      'IN_PROGRESS',
    );
    expect(progressRepo.countByStatus).toHaveBeenNthCalledWith(2, 'COMPLETED');
    expect(progressRepo.countByStatus).toHaveBeenNthCalledWith(3, 'ON_HOLD');
    expect(result).toEqual({
      totalOnboardings: 10,
      inProgress: 6,
      completed: 3,
      onHold: 1,
      averageCompletionRate: 30,
      newEmployeesLast30Days: 8,
      newEmployeesPrevious30Days: 4,
      growthRate: 100,
    });
  });

  it('exports onboarding progress rows to excel with mapped columns', async () => {
    progressRepo.findAll.mockResolvedValue([
      {
        employee: {
          fullName: 'Nguyen Van A',
          companyEmail: 'a@example.com',
          department: { departmentName: 'HR' },
          position: { positionName: 'Specialist' },
        },
        plan: { planName: 'Onboarding 14 days' },
        startDate: '2026-04-01',
        expectedEndDate: '2026-04-15',
        overallStatus: 'IN_PROGRESS',
        progressPercentage: 50,
      },
    ]);
    ExcelUtil.export.mockResolvedValue('excel-buffer');

    const result = await service.exportExcel();

    expect(progressRepo.findAll).toHaveBeenCalledWith(0, 10000);
    expect(ExcelUtil.export).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          index: 1,
          employeeName: 'Nguyen Van A',
          email: 'a@example.com',
          department: 'HR',
          position: 'Specialist',
          planName: 'Onboarding 14 days',
          status: 'IN_PROGRESS',
          progressPercentage: 50,
        }),
      ]),
      expect.arrayContaining([
        expect.objectContaining({ header: 'STT', key: 'index' }),
        expect.objectContaining({
          header: 'Tiến độ %',
          key: 'progressPercentage',
        }),
      ]),
      'Tiến trình onboarding',
    );
    expect(result).toBe('excel-buffer');
  });
});
