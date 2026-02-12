import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  CreateOnboardingPlanDto,
  UpdateOnboardingPlanDto,
  QueryOnboardingPlanDto
} from '../models/dto/onboarding/index.js';

import { OnboardingPlansService } from '../services/onboarding-plans.service.js';
import { ResponseUtil } from '../common/utils/response.util.js';

export class OnboardingPlansController {
  constructor() {
    this.plansService = new OnboardingPlansService();
  }

  // =========================
  // GET /onboarding-plans
  // =========================
  list = async (req, res, next) => {
    try {
      // 1. Transform query -> DTO
      const queryDto = plainToInstance(
        QueryOnboardingPlanDto,
        req.query,
        { enableImplicitConversion: true }
      );

      // 2. Validate query DTO
      const errors = await validate(queryDto, {
        whitelist: true,
        forbidNonWhitelisted: true
      });

      if (errors.length > 0) {
        const err = new Error('Invalid query parameters');
        err.status = 400;
        err.details = errors;
        throw err;
      }

      // 3. Call service
      const result = await this.plansService.getAllPlans(queryDto);

      return ResponseUtil.successResponse(
        res,
        200,
        result,
        'Onboarding plans retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  // =========================
  // GET /onboarding-plans/:id
  // =========================
  getById = async (req, res, next) => {
    try {
      const { id } = req.params;

      const plan = await this.plansService.getPlanById(id);

      return ResponseUtil.successResponse(
        res,
        200,
        plan,
        'Onboarding plan retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  // =========================
  // GET /onboarding-plans/department/:departmentId
  // =========================
  getByDepartment = async (req, res, next) => {
    try {
      const departmentId = Number(req.params.departmentId);

      const plans = await this.plansService.getPlansByDepartment(departmentId);

      return ResponseUtil.successResponse(
        res,
        200,
        plans,
        'Department onboarding plans retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  // =========================
  // GET /onboarding-plans/templates
  // =========================
  getTemplates = async (req, res, next) => {
    try {
      const templates = await this.plansService.findTemplates();

      return ResponseUtil.successResponse(
        res,
        200,
        templates,
        'Onboarding templates retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  // =========================
  // POST /onboarding-plans
  // =========================
  create = async (req, res, next) => {
    try {
      // Map body -> Create DTO
      const createDto = plainToInstance(
        CreateOnboardingPlanDto,
        req.body,
        { enableImplicitConversion: true }
      );

      const errors = await validate(createDto, {
        whitelist: true,
        forbidNonWhitelisted: true
      });

      if (errors.length > 0) {
        const err = new Error('Invalid request body');
        err.status = 400;
        err.details = errors;
        throw err;
      }

      const data = {
        ...createDto,
        createdBy: req.user?.id
      };

      const plan = await this.plansService.createPlan(data);

      return ResponseUtil.successResponse(
        res,
        201,
        plan,
        'Onboarding plan created successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  // =========================
  // PUT /onboarding-plans/:id
  // =========================
  update = async (req, res, next) => {
    try {
      const { id } = req.params;

      const updateDto = plainToInstance(
        UpdateOnboardingPlanDto,
        req.body,
        { enableImplicitConversion: true }
      );

      const errors = await validate(updateDto, {
        whitelist: true,
        forbidNonWhitelisted: true
      });

      if (errors.length > 0) {
        const err = new Error('Invalid request body');
        err.status = 400;
        err.details = errors;
        throw err;
      }

      const plan = await this.plansService.updatePlan(id, updateDto);

      return ResponseUtil.successResponse(
        res,
        200,
        plan,
        'Onboarding plan updated successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  // =========================
  // DELETE /onboarding-plans/:id
  // =========================
  delete = async (req, res, next) => {
    try {
      const { id } = req.params;

      await this.plansService.deletePlan(id);

      return ResponseUtil.successResponse(
        res,
        200,
        null,
        'Onboarding plan deleted successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  // =========================
  // POST /onboarding-plans/:id/duplicate
  // =========================
  duplicate = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { newPlanName } = req.body;

      if (!newPlanName) {
        const err = new Error('newPlanName is required');
        err.status = 400;
        throw err;
      }

      const plan = await this.plansService.duplicatePlan(id, newPlanName);

      return ResponseUtil.successResponse(
        res,
        201,
        plan,
        'Onboarding plan duplicated successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  // =========================
  // GET /onboarding-plans/:id/stats
  // =========================
  getStats = async (req, res, next) => {
    try {
      const { id } = req.params;

      const stats = await this.plansService.getPlanStats(id);

      return ResponseUtil.successResponse(
        res,
        200,
        stats,
        'Plan statistics retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };
}
