import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import {
  QueryOnboardingProgressDto,
  CreateOnboardingProgressDto,
  UpdateOnboardingProgressDto,
} from '../models/dto/onboarding/index.js';
import { OnboardingProgressService } from '../services/onboarding-progress.service.js';
import { AppMessages } from '../common/constants/index.js';

export class OnboardingProgressController {
  constructor() {
    this.progressService = new OnboardingProgressService();
  }

  findAll = async (req, res, next) => {
    try {
      const queryDto = plainToInstance(QueryOnboardingProgressDto, req.query);
      const result = await this.progressService.findAll(queryDto);
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
      const id = parseInt(req.params.id);
      const progress = await this.progressService.findById(id);
      res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  };

  findByEmployee = async (req, res, next) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const progress = await this.progressService.findByEmployee(employeeId);
      res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const createDto = plainToInstance(CreateOnboardingProgressDto, req.body);
      await validateOrReject(createDto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });
      const { employeeId, planId, assignedMentorId } = createDto;
      const progress = await this.progressService.create(
        employeeId,
        planId,
        assignedMentorId,
      );
      res.status(201).json({
        success: true,
        data: progress,
        message:
          AppMessages.Success.Onboarding?.PROGRESS_CREATED ||
          AppMessages.Success.CREATED,
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const updateDto = plainToInstance(UpdateOnboardingProgressDto, req.body);
      await validateOrReject(updateDto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });
      const progress = await this.progressService.update(id, updateDto);
      res.status(200).json({
        success: true,
        data: progress,
        message:
          AppMessages.Success.Onboarding?.PROGRESS_UPDATED ||
          AppMessages.Success.UPDATED,
      });
    } catch (error) {
      next(error);
    }
  };

  complete = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const progress = await this.progressService.complete(id);
      res.status(200).json({
        success: true,
        data: progress,
        message: 'Onboarding completed successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  pause = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const progress = await this.progressService.pause(id);
      res.status(200).json({
        success: true,
        data: progress,
        message: 'Onboarding paused successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  resume = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const progress = await this.progressService.resume(id);
      res.status(200).json({
        success: true,
        data: progress,
        message: 'Onboarding resumed successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  findByDepartment = async (req, res, next) => {
    try {
      const departmentId = parseInt(req.params.departmentId);
      const progress =
        await this.progressService.findByDepartment(departmentId);
      res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  };

  getStatistics = async (req, res, next) => {
    try {
      const stats = await this.progressService.getStatistics();
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
}
