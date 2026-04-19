import 'reflect-metadata';
import { OnboardingProgressService } from '../onboarding-progress.service.js';
import { OnboardingProgressRepository } from '../../repositories/onboarding-progress.repository.js';
import { OnboardingPlansRepository } from '../../repositories/onboarding-plans.repository.js';
import { TaskAssignmentsRepository } from '../../repositories/task-assignments.repository.js';
import { EmployeesRepository } from '../../repositories/employees.repository.js';

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
});
