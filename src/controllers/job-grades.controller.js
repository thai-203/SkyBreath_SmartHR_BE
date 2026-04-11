import { JobGradesService } from '../services/job-grades.service.js';
import { AppMessages } from '../common/constants/index.js';

export class JobGradesController {
  constructor() {
    this.jobGradesService = new JobGradesService();
  }

  create = async (req, res, next) => {
    try {
      const jobGrade = await this.jobGradesService.create(req.body);
      res.status(201).json({
        success: true,
        data: jobGrade,
        message: AppMessages.Success.CREATED,
      });
    } catch (error) {
      next(error);
    }
  };

  findAll = async (req, res, next) => {
    try {
      const result = await this.jobGradesService.findAll(req.query);
      res.status(200).json({
        success: true,
        ...result, // thường gồm items, total, page, limit
      });
    } catch (error) {
      next(error);
    }
  };

  findById = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const jobGrade = await this.jobGradesService.findById(id);
      res.status(200).json({
        success: true,
        data: jobGrade,
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const jobGrade = await this.jobGradesService.update(id, req.body);
      res.status(200).json({
        success: true,
        data: jobGrade,
        message: AppMessages.Success.UPDATED,
      });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      await this.jobGradesService.remove(id);
      res.status(200).json({
        success: true,
        message: AppMessages.Success.DELETED,
      });
    } catch (error) {
      next(error);
    }
  };

  findList = async (req, res, next) => {
    try {
      const jobGrades = await this.jobGradesService.findList();
      res.status(200).json({
        success: true,
        data: jobGrades,
      });
    } catch (error) {
      next(error);
    }
  };

  exportExcel = async (req, res, next) => {
    try {
      const buffer = await this.jobGradesService.exportExcel();
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=job-grades.xlsx',
      );
      res.setHeader('Content-Length', buffer.length);
      res.end(buffer);
    } catch (error) {
      next(error);
    }
  };
}
