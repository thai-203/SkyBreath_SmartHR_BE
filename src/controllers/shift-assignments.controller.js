import { ShiftAssignmentsService } from '../services/shift-assignments.service.js';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateShiftAssignmentDto,
  UpdateShiftAssignmentDto,
  ShiftAssignmentQueryDto,
} from '../models/dto/shifts/index.js';
import { ResponseUtil } from '../common/utils/response.util.js';
import { AppMessages } from '../common/constants/index.js';

export class ShiftAssignmentsController {
  constructor() {
    this.assignService = new ShiftAssignmentsService();
  }

  assignToEmployee = async (req, res, next) => {
    try {
      const dto = plainToInstance(CreateShiftAssignmentDto, req.body);
      const errors = await validate(dto);
      if (errors.length > 0) {
        const message = Object.values(errors[0].constraints)[0];
        return ResponseUtil.sendResponse(res, message, null, 400);
      }
      // unified creation method handles both employee and department cases
      const result = await this.assignService.createAssignment(dto);
      res.status(201).json({
        success: true,
        data: result,
        message: AppMessages.Success.CREATED,
      });
    } catch (error) {
      next(error);
    }
  };

  assignByDepartment = async (req, res, next) => {
    try {
      const dto = plainToInstance(CreateShiftAssignmentDto, req.body);
      const errors = await validate(dto);
      if (errors.length > 0) {
        const message = Object.values(errors[0].constraints)[0];
        return ResponseUtil.sendResponse(res, message, null, 400);
      }
      const assignments = await this.assignService.assignByDepartment(dto);
      res.status(201).json({
        success: true,
        data: assignments,
        message: AppMessages.Success.CREATED,
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const dto = plainToInstance(UpdateShiftAssignmentDto, req.body);
      const errors = await validate(dto);
      if (errors.length > 0) {
        const message = Object.values(errors[0].constraints)[0];
        return ResponseUtil.sendResponse(res, message, null, 400);
      }
      const updated = await this.assignService.updateAssignment(id, dto);
      res.status(200).json({
        success: true,
        data: updated,
        message: AppMessages.Success.UPDATED,
      });
    } catch (error) {
      next(error);
    }
  };

  cancel = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      await this.assignService.cancelAssignment(id);
      res
        .status(200)
        .json({ success: true, message: AppMessages.Success.DELETED });
    } catch (error) {
      next(error);
    }
  };

  list = async (req, res, next) => {
    try {
      console.log('Received query parameters:', req.query);
      const queryDto = plainToInstance(ShiftAssignmentQueryDto, req.query);
      const result = await this.assignService.findAll(queryDto);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  viewEmployeeSchedule = async (req, res, next) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const { month, year } = req.query;
      const schedule = await this.assignService.getEmployeeSchedule(
        employeeId,
        parseInt(month),
        parseInt(year),
      );
      res.status(200).json({ success: true, data: schedule });
    } catch (error) {
      next(error);
    }
  };

  viewDepartmentSchedule = async (req, res, next) => {
    try {
      const departmentId = parseInt(req.params.departmentId);
      const { month, year } = req.query;
      const schedule = await this.assignService.getDepartmentSchedule(
        departmentId,
        parseInt(month),
        parseInt(year),
      );
      res.status(200).json({ success: true, data: schedule });
    } catch (error) {
      next(error);
    }
  };
}
