import { OnboardingTasksService } from '../onboarding-tasks.service.js';
import { OnboardingTasksRepository } from '../../repositories/onboarding-tasks.repository.js';

jest.mock('../../repositories/onboarding-tasks.repository.js', () => ({
  OnboardingTasksRepository: jest.fn(),
}));

describe('OnboardingTasksService', () => {
  let service;
  let tasksRepo;

  beforeEach(() => {
    jest.clearAllMocks();

    tasksRepo = {
      findByPlanId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteByPlanId: jest.fn(),
    };

    OnboardingTasksRepository.mockImplementation(() => tasksRepo);
    service = new OnboardingTasksService();
  });

  it('auto-assigns taskOrder when create payload does not include it', async () => {
    tasksRepo.findByPlanId.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    tasksRepo.create.mockImplementation((payload) => payload);
    tasksRepo.save.mockImplementation(async (task) => ({ id: 3, ...task }));

    const result = await service.create(9, {
      description: 'Prepare laptop',
      category: 'IT',
      estimatedDays: 1,
      isMandatory: true,
    });

    expect(tasksRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: 9,
        taskOrder: 3,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 3,
        taskOrder: 3,
      }),
    );
  });

  it('updates and then returns the latest task', async () => {
    tasksRepo.findById.mockResolvedValue({
      id: 12,
      description: 'Updated task',
    });

    const result = await service.update(12, {
      description: 'Updated task',
      category: 'Admin',
      estimatedDays: 2,
      isMandatory: false,
      responsibleDepartmentId: 5,
      status: 'ACTIVE',
    });

    expect(tasksRepo.update).toHaveBeenCalledWith(
      12,
      expect.objectContaining({
        description: 'Updated task',
        category: 'Admin',
      }),
    );
    expect(result).toEqual({ id: 12, description: 'Updated task' });
  });

  it('deletes tasks by plan id', async () => {
    tasksRepo.deleteByPlanId.mockResolvedValue({ affected: 4 });

    const result = await service.deleteByPlanId(22);

    expect(tasksRepo.deleteByPlanId).toHaveBeenCalledWith(22);
    expect(result).toEqual({ affected: 4 });
  });
});
