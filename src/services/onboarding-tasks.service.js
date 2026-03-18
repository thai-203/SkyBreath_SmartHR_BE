import { OnboardingTasksRepository } from '../repositories/onboarding-tasks.repository.js';

export class OnboardingTasksService {
  constructor() {
    this.onboardingTasksRepository = new OnboardingTasksRepository();
  }

  async getByPlanId(planId) {
    return this.onboardingTasksRepository.findByPlanId(planId);
  }

  async findById(id) {
    return this.onboardingTasksRepository.findById(id);
  }

  async create(planId, body) {
    let taskOrder = body.taskOrder;
    if (!taskOrder) {
      const existing =
        await this.onboardingTasksRepository.findByPlanId(planId);
      taskOrder = existing.length + 1;
    }
    const task = this.onboardingTasksRepository.create({
      planId,
      taskOrder,
      description: body.description,
      category: body.category,
      estimatedDays: body.estimatedDays,
      isMandatory: body.isMandatory,
      responsibleDepartmentId: body.responsibleDepartmentId,
    });

    return this.onboardingTasksRepository.save(task);
  }

  async update(id, body) {
    await this.onboardingTasksRepository.update(id, {
      description: body.description,
      category: body.category,
      estimatedDays: body.estimatedDays,
      isMandatory: body.isMandatory,
      responsibleDepartmentId: body.responsibleDepartmentId,
      status: body.status,
    });

    return this.onboardingTasksRepository.findById(id);
  }

  async delete(id) {
    return this.onboardingTasksRepository.delete(id);
  }

  async deleteByPlanId(planId) {
    return this.onboardingTasksRepository.deleteByPlanId(planId);
  }
}
