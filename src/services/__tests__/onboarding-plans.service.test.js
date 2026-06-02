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

  const expectRejectWithStatusAndMessage = async (
    promise,
    statusCode,
    message,
  ) => {
    try {
      await promise;
      throw new Error('Expected promise to reject');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.statusCode).toBe(statusCode);
      expect(err.message).toBe(message);
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

  describe('Create Onboarding Plan - Success Cases', () => {
    it('creates a new onboarding plan successfully with valid data', async () => {
      progressRepo.findByEmployeeId.mockResolvedValue(null);
      employeesRepo.findById.mockResolvedValue({
        id: 15,
        fullName: 'Nguyen Van A',
        departmentId: 2,
        positionId: 5,
      });
      plansRepo.create.mockResolvedValue({
        id: 100,
        planName: 'Onboarding Mới',
        employeeId: 15,
        startDate: '2026-05-15',
        departmentId: 2,
        positionId: 5,
        isTemplate: false,
        durationDays: 14,
      });
      progressRepo.create.mockResolvedValue({
        id: 200,
        planId: 100,
        employeeId: 15,
      });
      tasksRepo.findByPlanId.mockResolvedValue([
        { id: 300, taskOrder: 1, description: 'Task 1' },
      ]);
      assignmentsRepo.create.mockResolvedValue({ id: 400 });

      const result = await service.create(
        {
          planName: 'Onboarding Mới',
          isTemplate: false,
          employeeId: 15,
          startDate: '2026-05-15',
          departmentId: 2,
          positionId: 5,
          durationDays: 14,
          tasks: [
            { taskOrder: 1, description: 'Task 1', dueDate: '2026-05-20' },
          ],
        },
        1,
      );

      expect(plansRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          planName: 'Onboarding Mới',
          isTemplate: false,
          employeeId: 15,
        }),
      );
      expect(result.id).toBe(100);
      expect(result.planName).toBe('Onboarding Mới');
    });
  });

  describe('Create Onboarding Plan - Validation Cases', () => {
    it('throws error when plan name is missing', async () => {
      await expectRejectWithStatus(
        service.create(
          {
            isTemplate: false,
            employeeId: 20,
            startDate: '2026-05-15',
            departmentId: 2,
            positionId: 5,
          },
          1,
        ),
        400,
      );
    });

    it('throws error when start date is missing', async () => {
      progressRepo.findByEmployeeId.mockResolvedValue(null);
      employeesRepo.findById.mockResolvedValue({
        id: 20,
        departmentId: 2,
        positionId: 5,
        employmentStatus: 'ACTIVE',
      });

      await expectRejectWithStatus(
        service.create(
          {
            planName: 'Plan Test',
            isTemplate: false,
            employeeId: 20,
            departmentId: 2,
            positionId: 5,
          },
          1,
        ),
        400,
      );
    });

    it('throws error when department or position is missing', async () => {
      progressRepo.findByEmployeeId.mockResolvedValue(null);
      employeesRepo.findById.mockResolvedValue({
        id: 20,
        departmentId: null,
        positionId: null,
        employmentStatus: 'ACTIVE',
      });

      await expectRejectWithStatus(
        service.create(
          {
            planName: 'Plan Test',
            isTemplate: false,
            employeeId: 20,
            startDate: '2026-05-15',
          },
          1,
        ),
        400,
      );
    });

    it('throws error when employeeId is missing for non-template', async () => {
      await expectRejectWithStatusAndMessage(
        service.create(
          {
            planName: 'Plan thiếu nhân viên',
            isTemplate: false,
            startDate: '2026-05-15',
            departmentId: 2,
            positionId: 5,
          },
          1,
        ),
        400,
        'Nhân viên là thông tin bắt buộc cho kế hoạch',
      );
    });

    it('throws NotFoundException when employee does not exist', async () => {
      progressRepo.findByEmployeeId.mockResolvedValue(null);
      employeesRepo.findById.mockResolvedValue(null);

      await expectRejectWithStatus(
        service.create(
          {
            planName: 'Plan employee not found',
            isTemplate: false,
            employeeId: 999,
            startDate: '2026-05-15',
            departmentId: 2,
            positionId: 5,
          },
          1,
        ),
        404,
      );
    });

    it('throws error when employee is inactive', async () => {
      progressRepo.findByEmployeeId.mockResolvedValue(null);
      employeesRepo.findById.mockResolvedValue({
        id: 20,
        employmentStatus: 'INACTIVE',
      });

      await expectRejectWithStatusAndMessage(
        service.create(
          {
            planName: 'Plan cho nhân viên nghỉ việc',
            isTemplate: false,
            employeeId: 20,
            startDate: '2026-05-15',
            departmentId: 2,
            positionId: 5,
          },
          1,
        ),
        400,
        'Không thể tạo kế hoạch onboarding cho nhân viên không còn hoạt động',
      );
    });

    it('throws error when startDate has invalid format', async () => {
      progressRepo.findByEmployeeId.mockResolvedValue(null);
      employeesRepo.findById.mockResolvedValue({
        id: 20,
        departmentId: 2,
        positionId: 5,
        employmentStatus: 'ACTIVE',
      });

      await expectRejectWithStatusAndMessage(
        service.create(
          {
            planName: 'Plan ngày sai',
            isTemplate: false,
            employeeId: 20,
            startDate: '2026-99-99',
            departmentId: 2,
            positionId: 5,
          },
          1,
        ),
        400,
        'Ngày bắt đầu không hợp lệ',
      );
    });

    it('autofills department and position from employee when missing and still creates plan', async () => {
      progressRepo.findByEmployeeId.mockResolvedValue(null);
      employeesRepo.findById
        .mockResolvedValueOnce({
          id: 21,
          fullName: 'Nguyen Van B',
          departmentId: 2,
          positionId: 3,
          employmentStatus: 'ACTIVE',
        })
        .mockResolvedValueOnce({
          id: 21,
          fullName: 'Nguyen Van B',
          userId: null,
        });
      plansRepo.create.mockResolvedValue({
        id: 101,
        planName: 'Plan auto fill',
        employeeId: 21,
        departmentId: 2,
        positionId: 3,
      });
      progressRepo.create.mockResolvedValue({ id: 201, planId: 101 });
      tasksRepo.findByPlanId.mockResolvedValue([
        { id: 301, taskOrder: 1, description: 'Task A' },
      ]);
      assignmentsRepo.create.mockResolvedValue({ id: 401 });

      const result = await service.create(
        {
          planName: 'Plan auto fill',
          isTemplate: false,
          employeeId: 21,
          startDate: '2026-05-15',
          durationDays: 7,
          tasks: [
            { taskOrder: 1, description: 'Task A', dueDate: '2026-05-17' },
          ],
        },
        1,
      );

      expect(plansRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          departmentId: 2,
          positionId: 3,
        }),
      );
      expect(result.id).toBe(101);
    });

    it('throws error when department and position are missing after employee autofill', async () => {
      progressRepo.findByEmployeeId.mockResolvedValue(null);
      employeesRepo.findById.mockResolvedValue({
        id: 22,
        departmentId: null,
        positionId: null,
        employmentStatus: 'ACTIVE',
      });

      await expectRejectWithStatusAndMessage(
        service.create(
          {
            planName: 'Plan thiếu phòng ban/chức vụ',
            isTemplate: false,
            employeeId: 22,
            startDate: '2026-05-15',
          },
          1,
        ),
        400,
        'Phòng ban và chức vụ không được để trống',
      );
    });

    it('throws ConflictException when employee already has active onboarding plan', async () => {
      progressRepo.findByEmployeeId.mockResolvedValue({
        id: 25,
        employeeId: 18,
        overallStatus: 'IN_PROGRESS',
      });

      await expectRejectWithStatus(
        service.create(
          {
            planName: 'Onboarding Duplicate',
            isTemplate: false,
            employeeId: 18,
            startDate: '2026-05-15',
            departmentId: 2,
            positionId: 5,
          },
          1,
        ),
        409,
      );

      expect(plansRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('Create Onboarding Template - Success Cases', () => {
    it('creates a template successfully with valid data', async () => {
      plansRepo.findTemplateByDepartmentAndPosition.mockResolvedValue(null);
      plansRepo.create.mockResolvedValue({
        id: 50,
        planName: 'Template Dev 14 days',
        isTemplate: true,
        departmentId: 2,
        positionId: 3,
        durationDays: 14,
        status: 'draft',
      });

      const result = await service.create(
        {
          planName: 'Template Dev 14 days',
          isTemplate: true,
          departmentId: 2,
          positionId: 3,
          durationDays: 14,
          status: 'draft',
        },
        1,
      );

      expect(plansRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          planName: 'Template Dev 14 days',
          isTemplate: true,
        }),
      );
      expect(result.id).toBe(50);
    });
  });

  describe('Create Onboarding Template - Validation Cases', () => {
    it('throws error when template plan name is missing', async () => {
      plansRepo.findTemplateByDepartmentAndPosition.mockResolvedValue(null);

      await expectRejectWithStatus(
        service.create(
          {
            isTemplate: true,
            departmentId: 2,
            positionId: 3,
            durationDays: 14,
          },
          1,
        ),
        400,
      );
    });

    it('throws error when department or position is missing for template', async () => {
      await expectRejectWithStatus(
        service.create(
          {
            planName: 'Template Test',
            isTemplate: true,
            durationDays: 14,
          },
          1,
        ),
        400,
      );
    });

    it('throws ConflictException when template already exists for department and position', async () => {
      plansRepo.findTemplateByDepartmentAndPosition.mockResolvedValue({
        id: 45,
        planName: 'Existing Template',
        departmentId: 2,
        positionId: 3,
      });

      await expectRejectWithStatus(
        service.create(
          {
            planName: 'Template Dev Duplicate',
            isTemplate: true,
            departmentId: 2,
            positionId: 3,
            durationDays: 14,
          },
          1,
        ),
        409,
      );

      expect(plansRepo.create).not.toHaveBeenCalled();
    });

    it('throws error when template status is invalid', async () => {
      await expectRejectWithStatusAndMessage(
        service.create(
          {
            planName: 'Template invalid status',
            isTemplate: true,
            departmentId: 2,
            positionId: 3,
            durationDays: 14,
            status: 'COMPLETED',
          },
          1,
        ),
        400,
        'Trạng thái không hợp lệ',
      );
    });
  });
});
