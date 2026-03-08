import { OnboardingTasksService } from '../services/onboarding-tasks.service.js';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import {
  CreateOnboardingTaskDto,
  UpdateOnboardingTaskDto,
} from '../models/dto/onboarding/index.js';

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

  async create(req, res, next) {
    try {
      const dto = plainToInstance(CreateOnboardingTaskDto, req.body);
      await validateOrReject(dto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });
      const task = await this.onboardingTasksService.create(
        req.params.planId,
        dto,
      );
      return res.success(task);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const dto = plainToInstance(UpdateOnboardingTaskDto, req.body);
      await validateOrReject(dto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });
      await this.onboardingTasksService.update(req.params.id, dto);
      return res.success();
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res) {
    await this.onboardingTasksService.delete(req.params.id);
    return res.success();
  }
}
