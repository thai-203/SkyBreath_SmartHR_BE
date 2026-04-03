import { AttendanceSecurityConfigService } from '../services/attendance-security-config.service.js';
import { AppMessages } from '../common/constants/index.js';
import { ResponseUtil } from '../common/utils/response.util.js';

export class AttendanceSecurityConfigController {
  constructor() {
    this.service = new AttendanceSecurityConfigService();
  }

  getConfig = async (req, res, next) => {
    try {
      const config = await this.service.getConfig();
      ResponseUtil.sendResponse(res, AppMessages.Success.AttendanceSecurityConfig.RETRIEVED, config);
    } catch (error) {
      next(error);
    }
  };

  updateConfig = async (req, res, next) => {
    try {
      const updated = await this.service.updateConfig(req.body);
      ResponseUtil.sendResponse(res, AppMessages.Success.AttendanceSecurityConfig.UPDATED, updated);
    } catch (error) {
      next(error);
    }
  };

  resetToDefaults = async (req, res, next) => {
    try {
      const result = await this.service.resetToDefaults();
      ResponseUtil.sendResponse(res, AppMessages.Success.AttendanceSecurityConfig.RESET, result);
    } catch (error) {
      next(error);
    }
  };
}
