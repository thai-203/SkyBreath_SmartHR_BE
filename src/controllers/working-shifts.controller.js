import { WorkingShiftsService } from '../services/working-shifts.service.js';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateWorkingShiftDto,
  UpdateWorkingShiftDto,
  WorkingShiftQueryDto,
} from '../models/dto/shifts/index.js';
import { ResponseUtil } from '../common/utils/response.util.js';
import { AppMessages } from '../common/constants/index.js';

export class WorkingShiftsController {
  constructor() {
    this.shiftsService = new WorkingShiftsService();
  }

  create = async (req, res, next) => {
    try {
      const dto = plainToInstance(CreateWorkingShiftDto, req.body);
      const errors = await validate(dto);
      if (errors.length > 0) {
        const message = Object.values(errors[0].constraints)[0];
        return ResponseUtil.sendResponse(res, message, null, 400);
      }
      const shift = await this.shiftsService.create(dto);
      res
        .status(201)
        .json({
          success: true,
          data: shift,
          message: AppMessages.Success.CREATED,
        });
    } catch (error) {
      next(error);
    }
  };

  findAll = async (req, res, next) => {
    try {
      const queryDto = plainToInstance(WorkingShiftQueryDto, req.query);
      const result = await this.shiftsService.findAll(queryDto);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  findOne = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const shift = await this.shiftsService.findById(id);
      res.status(200).json({ success: true, data: shift });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const dto = plainToInstance(UpdateWorkingShiftDto, req.body);
      const errors = await validate(dto);
      if (errors.length > 0) {
        const message = Object.values(errors[0].constraints)[0];
        return ResponseUtil.sendResponse(res, message, null, 400);
      }
      const shift = await this.shiftsService.update(id, dto);
      res
        .status(200)
        .json({
          success: true,
          data: shift,
          message: AppMessages.Success.UPDATED,
        });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      await this.shiftsService.remove(id);
      res
        .status(200)
        .json({ success: true, message: AppMessages.Success.DELETED });
    } catch (error) {
      next(error);
    }
  };

  list = async (req, res, next) => {
    try {
        const list = await this.shiftsService.findList();
        res.status(200).json({
            success: true,
            data: list,
        });
    } catch (error) {
        next(error);
    }
  };
}
