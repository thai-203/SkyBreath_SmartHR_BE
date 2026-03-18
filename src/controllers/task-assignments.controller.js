import { TaskAssignmentsService } from '../services/task-assignments.service.js';
import { ResponseUtil } from '../common/utils/response.util.js';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import {
  CreateTaskAssignmentDto,
  UpdateTaskAssignmentDto,
} from '../models/dto/onboarding/index.js';

export class TaskAssignmentsController {
  constructor() {
    this.assignmentsService = new TaskAssignmentsService();
  }

  list = async (req, res, next) => {
    try {
      const { skip = 0, take = 10 } = req.query;
      const result = await this.assignmentsService.getAllAssignments(
        parseInt(skip),
        parseInt(take),
      );
      return ResponseUtil.successResponse(
        res,
        200,
        result,
        'Task assignments retrieved successfully',
      );
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const assignment = await this.assignmentsService.getAssignmentById(id);
      return ResponseUtil.successResponse(
        res,
        200,
        assignment,
        'Task assignment retrieved successfully',
      );
    } catch (error) {
      next(error);
    }
  };

  getByProgress = async (req, res, next) => {
    try {
      const { progressId } = req.params;
      const assignments =
        await this.assignmentsService.getAssignmentsByProgress(progressId);
      return ResponseUtil.successResponse(
        res,
        200,
        assignments,
        'Progress assignments retrieved successfully',
      );
    } catch (error) {
      next(error);
    }
  };

  getByEmployee = async (req, res, next) => {
    try {
      const { employeeId } = req.params;
      const assignments =
        await this.assignmentsService.getAssignmentsByEmployee(employeeId);
      return ResponseUtil.successResponse(
        res,
        200,
        assignments,
        'Employee assignments retrieved successfully',
      );
    } catch (error) {
      next(error);
    }
  };

  getByStatus = async (req, res, next) => {
    try {
      const { status } = req.params;
      const assignments =
        await this.assignmentsService.getAssignmentsByStatus(status);
      return ResponseUtil.successResponse(
        res,
        200,
        assignments,
        `${status} assignments retrieved successfully`,
      );
    } catch (error) {
      next(error);
    }
  };

  getOverdue = async (req, res, next) => {
    try {
      const assignments = await this.assignmentsService.getOverdueAssignments();
      return ResponseUtil.successResponse(
        res,
        200,
        assignments,
        'Overdue assignments retrieved successfully',
      );
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const dto = plainToInstance(CreateTaskAssignmentDto, req.body);
      await validateOrReject(dto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });
      const userId = req.user?.id;
      const assignment = await this.assignmentsService.createAssignment(
        dto,
        userId,
      );
      return ResponseUtil.successResponse(
        res,
        201,
        assignment,
        'Việc phân công nhiệm vụ đã được tạo thành công',
      );
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const { id } = req.params;
      let updateData = { ...req.body };

      if (req.file) {
        updateData.evidencePath = req.file.path.replace(/\\/g, '/');
      }

      const dto = plainToInstance(UpdateTaskAssignmentDto, updateData);
      await validateOrReject(dto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });

      const result = await this.assignmentsService.updateAssignment(id, dto);

      ResponseUtil.sendResponse(res, 'Cập nhật nhiệm vụ thành công', result);
    } catch (error) {
      next(error);
    }
  };

  complete = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const assignment = await this.assignmentsService.completeAssignment(
        id,
        notes,
      );
      return ResponseUtil.successResponse(
        res,
        200,
        assignment,
        'Phân công nhiệm vụ đã được hoàn thành thành công',
      );
    } catch (error) {
      next(error);
    }
  };

  start = async (req, res, next) => {
    try {
      const { id } = req.params;
      const assignment = await this.assignmentsService.startAssignment(id);
      return ResponseUtil.successResponse(
        res,
        200,
        assignment,
        'Task assignment started successfully',
      );
    } catch (error) {
      next(error);
    }
  };

  reassign = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { newEmployeeId } = req.body;
      const assignment = await this.assignmentsService.reassignAssignment(
        id,
        newEmployeeId,
      );
      return ResponseUtil.successResponse(
        res,
        200,
        assignment,
        'Task assignment reassigned successfully',
      );
    } catch (error) {
      next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      const { id } = req.params;
      await this.assignmentsService.deleteAssignment(id);
      return ResponseUtil.successResponse(
        res,
        200,
        null,
        'Task assignment deleted successfully',
      );
    } catch (error) {
      next(error);
    }
  };

  getStats = async (req, res, next) => {
    try {
      const stats = await this.assignmentsService.getAssignmentStats();
      return ResponseUtil.successResponse(
        res,
        200,
        stats,
        'Assignment statistics retrieved successfully',
      );
    } catch (error) {
      next(error);
    }
  };
}
