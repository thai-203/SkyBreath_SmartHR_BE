import { AttendanceAllowedIpService } from '../services/attendance-allowed-ip.service.js';
import { AppMessages } from '../common/constants/index.js';
import { ResponseUtil } from '../common/utils/response.util.js';

export class AttendanceAllowedIpController {
  constructor() {
    this.service = new AttendanceAllowedIpService();
  }

  list = async (req, res, next) => {
    try {
      const items = await this.service.listAllowedIps();
      ResponseUtil.sendResponse(res, AppMessages.Success.AttendanceAllowedIp.RETRIEVED_ALL, items);
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const item = await this.service.createAllowedIp(req.body);
      ResponseUtil.sendResponse(res, AppMessages.Success.AttendanceAllowedIp.CREATED, item);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      await this.service.deleteAllowedIp(id);
      ResponseUtil.sendResponse(res, AppMessages.Success.AttendanceAllowedIp.DELETED, null);
    } catch (error) {
      next(error);
    }
  };
}
