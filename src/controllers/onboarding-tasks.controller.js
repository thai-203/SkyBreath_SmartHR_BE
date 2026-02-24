import { OnboardingTasksService } from '../services/onboarding-tasks.service.js';

export class OnboardingTasksController {
  constructor() {
    this.onboardingTasksService = new OnboardingTasksService();
  }

  async getByPlan(req, res) {
    const tasks = await this.onboardingTasksService.getByPlanId(
      req.params.planId,
    );
    return res.success(tasks);
  }

  async create(req, res) {
    const task = await this.onboardingTasksService.create(
      req.params.planId,
      req.body,
    );
    return res.success(task);
  }

  async update(req, res) {
    await this.onboardingTasksService.update(req.params.id, req.body);
    return res.success();
  }

  async delete(req, res) {
    await this.onboardingTasksService.delete(req.params.id);
    return res.success();
  }
}
