import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

import {
  CreateOnboardingPlanDto,
  UpdateOnboardingPlanDto,
  QueryOnboardingPlanDto,
} from '../models/dto/onboarding/index.js';

import { OnboardingPlansService } from '../services/onboarding-plans.service.js';
import { AppMessages } from '../common/constants/index.js';
import { BadRequestException } from '../common/exceptions/index.js';

export class OnboardingPlansController {
  constructor() {
    this.plansService = new OnboardingPlansService();
  }

  findAll = async (req, res, next) => {
    try {
      const queryDto = plainToInstance(QueryOnboardingPlanDto, req.query);
      // validate query parameters (pagination + employeeId etc.)
      try {
        await validateOrReject(queryDto, {
          whitelist: true,
          forbidNonWhitelisted: false,
        });
      } catch (validationErrors) {
        // class-validator returns an array of ValidationError objects
        throw new BadRequestException(
          'Tham số truy vấn không hợp lệ',
          validationErrors,
        );
      }
      // employeeId comes through as NaN if not numeric; ensure error instead
      if (
        req.query.employeeId !== undefined &&
        (isNaN(queryDto.employeeId) || queryDto.employeeId < 1)
      ) {
        throw new BadRequestException('ID nhân viên không hợp lệ');
      }

      const result = await this.plansService.findAll(queryDto);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  findOne = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id < 1) {
        // invalid id format -> bad request
        throw new BadRequestException('ID kế hoạch không hợp lệ');
      }
      const plan = await this.plansService.findById(id);
      res.status(200).json({
        success: true,
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  };

  findByDepartment = async (req, res, next) => {
    try {
      const departmentId = parseInt(req.params.departmentId);
      const plans = await this.plansService.findByDepartment(departmentId);
      res.status(200).json({
        success: true,
        data: plans,
      });
    } catch (error) {
      next(error);
    }
  };

  findTemplates = async (req, res, next) => {
    try {
      const templates = await this.plansService.findTemplates();
      res.status(200).json({
        success: true,
        data: templates,
      });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const createDto = plainToInstance(CreateOnboardingPlanDto, req.body);
      await validateOrReject(createDto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });

      // require employee and startDate for non-template plans
      if (!createDto.isTemplate) {
        if (!createDto.employeeId) {
          throw new BadRequestException(
            'Nhân viên là thông tin bắt buộc cho kế hoạch',
          );
        }
        if (!createDto.startDate) {
          throw new BadRequestException(
            'Ngày bắt đầu là thông tin bắt buộc cho kế hoạch',
          );
        }
      }

      const data = {
        ...createDto,
        createdBy: req.user?.id,
      };
      const plan = await this.plansService.create(data, req.user.id);
      res.status(201).json({
        success: true,
        data: plan,
        message:
          AppMessages.Success.Onboarding?.PLAN_CREATED ||
          AppMessages.Success.CREATED,
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id < 1) {
        throw new BadRequestException('ID kế hoạch không hợp lệ');
      }
      const updateDto = plainToInstance(UpdateOnboardingPlanDto, req.body);
      await validateOrReject(updateDto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });
      const plan = await this.plansService.update(id, updateDto);
      res.status(200).json({
        success: true,
        data: plan,
        message:
          AppMessages.Success.Onboarding?.PLAN_UPDATED ||
          AppMessages.Success.UPDATED,
      });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id < 1) {
        throw new BadRequestException('ID kế hoạch không hợp lệ');
      }
      await this.plansService.remove(id);
      res.status(200).json({
        success: true,
        message:
          AppMessages.Success.Onboarding?.PLAN_DELETED ||
          AppMessages.Success.DELETED,
      });
    } catch (error) {
      next(error);
    }
  };

  duplicate = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id < 1) {
        throw new BadRequestException('ID kế hoạch không hợp lệ');
      }
      const { newPlanName } = req.body;
      const plan = await this.plansService.duplicate(id, newPlanName);
      res.status(201).json({
        success: true,
        data: plan,
        message: 'Onboarding plan duplicated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // =========================
  // GET /onboarding-plans/:id/stats
  // =========================
  getStatistics = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id < 1) {
        throw new BadRequestException('ID kế hoạch không hợp lệ');
      }
      const stats = await this.plansService.getStatistics(id);
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
}
