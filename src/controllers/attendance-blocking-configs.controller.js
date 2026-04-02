import { ResponseUtil } from '../common/utils/response.util.js';
import { AppMessages } from '../common/constants/index.js';

export class AttendanceBlockingConfigController {
  constructor(attendanceBlockingConfigService) {
    this.attendanceBlockingConfigService = attendanceBlockingConfigService;
  }

  getRules = async (req, res, next) => {
    try {
      const result = await this.attendanceBlockingConfigService.getAll();
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Attendance.BLOCKING_RULES_RETRIEVED,
        result,
      );
    } catch (error) {
      next(error);
    }
  };

  // Tạo quy tắc mới
  createRule = async (req, res, next) => {
    try {
      const ruleData = req.body;
      const result =
        await this.attendanceBlockingConfigService.create(ruleData);
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Attendance.BLOCKING_RULE_CREATED,
        result,
      );
    } catch (error) {
      next(error);
    }
  };

  // Cập nhật quy tắc theo ID
  updateRule = async (req, res, next) => {
    try {
      const { id } = req.params;
      const ruleData = req.body;
      const result = await this.attendanceBlockingConfigService.update(
        id,
        ruleData,
      );
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Attendance.BLOCKING_RULE_UPDATED,
        result,
      );
    } catch (error) {
      next(error);
    }
  };

  // Bật/Tắt trạng thái quy tắc
  toggleStatus = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const result = await this.attendanceBlockingConfigService.updateStatus(
        id,
        isActive,
      );
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Attendance.BLOCKING_RULE_STATUS_UPDATED,
        result,
      );
    } catch (error) {
      next(error);
    }
  };

  // Xóa quy tắc
  deleteRule = async (req, res, next) => {
    try {
      const { id } = req.params;
      await this.attendanceBlockingConfigService.delete(id);
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Attendance.BLOCKING_RULE_DELETED,
      );
    } catch (error) {
      next(error);
    }
  };
}
