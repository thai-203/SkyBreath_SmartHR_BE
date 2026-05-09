import 'reflect-metadata';
import { OnboardingPlansService } from '../onboarding-plans.service.js';
import { OnboardingPlansRepository } from '../../repositories/onboarding-plans.repository.js';
import { OnboardingProgressRepository } from '../../repositories/onboarding-progress.repository.js';
import { OnboardingTasksRepository } from '../../repositories/onboarding-tasks.repository.js';
import { TaskAssignmentsRepository } from '../../repositories/task-assignments.repository.js';
import { EmployeesRepository } from '../../repositories/employees.repository.js';

jest.mock('../../repositories/onboarding-plans.repository.js', () => ({
  OnboardingPlansRepository: jest.fn(),
}));

jest.mock('../../repositories/onboarding-progress.repository.js', () => ({
  OnboardingProgressRepository: jest.fn(),
}));

jest.mock('../../repositories/onboarding-tasks.repository.js', () => ({
  OnboardingTasksRepository: jest.fn(),
}));

jest.mock('../../repositories/task-assignments.repository.js', () => ({
  TaskAssignmentsRepository: jest.fn(),
}));

jest.mock('../../repositories/employees.repository.js', () => ({
  EmployeesRepository: jest.fn(),
}));

describe('OnboardingPlansService', () => {
  let service;
  let plansRepo;
  let progressRepo;
  let tasksRepo;
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

    plansRepo = {
      findAll: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      findTemplateByDepartmentAndPosition: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    progressRepo = {
      findByEmployeeId: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    tasksRepo = {
      findByPlanId: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    assignmentsRepo = {
      findByProgressId: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };

    employeesRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    OnboardingPlansRepository.mockImplementation(() => plansRepo);
    OnboardingProgressRepository.mockImplementation(() => progressRepo);
    OnboardingTasksRepository.mockImplementation(() => tasksRepo);
    TaskAssignmentsRepository.mockImplementation(() => assignmentsRepo);
    EmployeesRepository.mockImplementation(() => employeesRepo);

    service = new OnboardingPlansService();
  });

  it('returns empty pagination when filtering by employeeId without progress', async () => {
    progressRepo.findByEmployeeId.mockResolvedValue(null);

    const result = await service.findAll({
      employeeId: 55,
      page: 1,
      limit: 10,
    });

    expect(result.data).toEqual([]);
    expect(result.meta.totalItems).toBe(0);
  });

  it('throws ConflictException when non-template plan already exists for employee', async () => {
    progressRepo.findByEmployeeId.mockResolvedValue({ id: 10, employeeId: 7 });

    await expectRejectWithStatus(
      service.create(
        {
          planName: 'Onboarding NHAN VIEN',
          isTemplate: false,
          employeeId: 7,
          startDate: '2026-04-01',
          departmentId: 1,
          positionId: 1,
        },
        1,
      ),
      409,
    );

    expect(plansRepo.create).not.toHaveBeenCalled();
  });

  it('throws ConflictException when creating duplicate template by department and position', async () => {
    plansRepo.findTemplateByDepartmentAndPosition.mockResolvedValue({ id: 4 });

    await expectRejectWithStatus(
      service.create(
        {
          planName: 'Template Dev',
          isTemplate: true,
          departmentId: 2,
          positionId: 3,
          status: 'draft',
        },
        1,
      ),
      409,
    );
  });

  it('rejects update when linked onboarding progress already started', async () => {
    plansRepo.findById.mockResolvedValue({
      id: 11,
      planName: 'Plan A',
      isTemplate: false,
      durationDays: 14,
    });

    progressRepo.findAll.mockResolvedValue([
      {
        id: 900,
        overallStatus: 'IN_PROGRESS',
      },
    ]);

    await expectRejectWithStatus(
      service.update(11, {
        planName: 'Plan Updated',
      }),
      400,
    );

    expect(plansRepo.save).not.toHaveBeenCalled();
  });

  it('returns the assigned plan when filtering by employeeId with existing progress', async () => {
    progressRepo.findByEmployeeId.mockResolvedValue({ id: 22, planId: 33 });
    plansRepo.findById.mockResolvedValue({ id: 33, planName: 'Assigned Plan' });

    const result = await service.findAll({
      employeeId: 12,
      page: 1,
      limit: 10,
    });

    expect(progressRepo.findByEmployeeId).toHaveBeenCalledWith(12);
    expect(plansRepo.findById).toHaveBeenCalledWith(33);
    expect(result.data).toEqual([{ id: 33, planName: 'Assigned Plan' }]);
    expect(result.meta.totalItems).toBe(1);
  });

  it('duplicates a plan without carrying over entity ids', async () => {
    plansRepo.findById.mockResolvedValue({
      id: 44,
      planName: 'Starter',
      description: 'Base plan',
      durationDays: 30,
      departmentId: 2,
      positionId: 3,
      isTemplate: true,
      tasks: [
        {
          id: 100,
          taskOrder: 1,
          description: 'Task A',
          createdAt: '2026-01-01',
          updatedAt: '2026-01-02',
        },
      ],
    });
    plansRepo.create.mockResolvedValue({ id: 55, planName: 'Starter Copy' });

    const result = await service.duplicate(44, 'Starter Copy');

    expect(plansRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        planName: 'Starter Copy',
        tasks: [
          expect.objectContaining({
            taskOrder: 1,
            description: 'Task A',
            id: undefined,
            createdAt: undefined,
            updatedAt: undefined,
          }),
        ],
      }),
    );
    expect(result).toEqual({ id: 55, planName: 'Starter Copy' });
  });
});
