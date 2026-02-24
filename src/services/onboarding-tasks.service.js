import { OnboardingTasksRepository } from '../repositories/onboarding-tasks.repository.js';

export class OnboardingTasksService {
  constructor() {
    this.onboardingTasksRepository = new OnboardingTasksRepository();
  }

  async getByPlanId(planId) {
    return this.onboardingTasksRepository.findByPlanId(planId);
  }

  async create(planId, body) {
    const task = this.onboardingTasksRepository.create({
      planId,
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

    return true;
  }

  async delete(id) {
    return this.onboardingTasksRepository.delete(id);
  }

  async deleteByPlanId(planId) {
    return this.onboardingTasksRepository.deleteByPlanId(planId);
  }
}
