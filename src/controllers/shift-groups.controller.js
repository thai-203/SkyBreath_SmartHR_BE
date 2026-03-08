import { ShiftGroupsService } from '../services/shift-groups.service.js';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateShiftGroupDto,
  UpdateShiftGroupDto,
  ShiftGroupQueryDto,
} from '../models/dto/shifts/index.js';
import { ResponseUtil } from '../common/utils/response.util.js';
import { AppMessages } from '../common/constants/index.js';

export class ShiftGroupsController {
  constructor() {
    this.shiftGroupsService = new ShiftGroupsService();
  }

  create = async (req, res, next) => {
    try {
      const dto = plainToInstance(CreateShiftGroupDto, req.body);
      const errors = await validate(dto);
      if (errors.length > 0) {
        const message = Object.values(errors[0].constraints)[0];
        return ResponseUtil.sendResponse(res, message, null, 400);
      }
      const group = await this.shiftGroupsService.create(dto);
      res
        .status(201)
        .json({
          success: true,
          data: group,
          message: AppMessages.Success.CREATED,
        });
    } catch (error) {
      next(error);
    }
  };

  findAll = async (req, res, next) => {
    try {
      const queryDto = plainToInstance(ShiftGroupQueryDto, req.query);
      const result = await this.shiftGroupsService.findAll(queryDto);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  findOne = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const group = await this.shiftGroupsService.findById(id);
      res.status(200).json({ success: true, data: group });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const dto = plainToInstance(UpdateShiftGroupDto, req.body);
      const errors = await validate(dto);
      if (errors.length > 0) {
        const message = Object.values(errors[0].constraints)[0];
        return ResponseUtil.sendResponse(res, message, null, 400);
      }
      const group = await this.shiftGroupsService.update(id, dto);
      res
        .status(200)
        .json({
          success: true,
          data: group,
          message: AppMessages.Success.UPDATED,
        });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      await this.shiftGroupsService.remove(id);
      res
        .status(200)
        .json({ success: true, message: AppMessages.Success.DELETED });
    } catch (error) {
      next(error);
    }
  };
}
