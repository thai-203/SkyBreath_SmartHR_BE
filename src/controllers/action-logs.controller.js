import { plainToInstance } from 'class-transformer';
import { ResponseUtil } from '../common/utils/response.util.js';
import { AppMessages } from '../common/constants/index.js';
import { ActionLogsService } from '../services/action-logs.service.js';
import { ActionLogQueryDto } from '../models/dto/action-logs';

export class ActionLogsController {
  constructor() {
    this.actionLogsService = new ActionLogsService();
  }

  findAll = async (req, res, next) => {
    try {
      const paginationDto = plainToInstance(ActionLogQueryDto, req.query);

      const result = await this.actionLogsService.findAll(paginationDto);

      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.ActionLog.RETRIEVED_ALL,
        result,
      );
    } catch (error) {
      next(error);
    }
  };

  findOne = async (req, res, next) => {
    try {
      const result = await this.actionLogsService.findById(
        parseInt(req.params.id),
      );
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.ActionLog.RETRIEVED,
        result,
      );
    } catch (error) {
      next(error);
    }
  };
  export = async (req, res, next) => {
    try {
      const buffer = await this.actionLogsService.exportExcel();
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=employees.xlsx',
      );
      res.setHeader('Content-Length', buffer.length);
      res.end(buffer);
    } catch (error) {
      next(error);
    }
  };
}
