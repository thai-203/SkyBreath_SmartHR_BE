import { OnboardingTasksService } from '../services/onboarding-tasks.service.js';
import { OnboardingPlansService } from '../services/onboarding-plans.service.js';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import {
  CreateOnboardingTaskDto,
  UpdateOnboardingTaskDto,
} from '../models/dto/onboarding/index.js';
import {
  BadRequestException,
  NotFoundException,
} from '../common/exceptions/index.js';

export class OnboardingTasksController {
  constructor() {
    this.onboardingTasksService = new OnboardingTasksService();
    // plan service used to verify existence when querying by plan
    this.plansService = new OnboardingPlansService();
  }

  getByPlan = async (req, res, next) => {
    try {
      const planId = parseInt(req.params.planId, 10);
      if (isNaN(planId) || planId < 1) {
        throw new BadRequestException('ID kế hoạch không hợp lệ');
      }
      // ensure plan exists (will throw NotFoundException if not)
      await this.plansService.findById(planId);

      const tasks = await this.onboardingTasksService.getByPlanId(planId);
      return res.status(200).json({ success: true, data: tasks });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const planId = parseInt(req.params.planId, 10);
      if (isNaN(planId) || planId < 1) {
        throw new BadRequestException('ID kế hoạch không hợp lệ');
      }
      // ensure plan exists (will throw NotFoundException if not)
      await this.plansService.findById(planId);
      const dto = plainToInstance(CreateOnboardingTaskDto, req.body);
      await validateOrReject(dto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });
      const task = await this.onboardingTasksService.create(planId, dto);
      return res.status(201).json({ success: true, data: task });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id < 1) {
        throw new BadRequestException('ID task không hợp lệ');
      }
      const existing = await this.onboardingTasksService.findById(id);
      if (!existing) {
        throw new NotFoundException('Không tìm thấy task');
      }
      const dto = plainToInstance(UpdateOnboardingTaskDto, req.body);
      await validateOrReject(dto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });
      const updated = await this.onboardingTasksService.update(id, dto);
      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      await this.onboardingTasksService.delete(req.params.id);
      return res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  };
}
