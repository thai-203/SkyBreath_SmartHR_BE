import { ResponseUtil } from '../common/utils/response.util.js';
import { AppMessages } from '../common/constants/index.js';
import { getClientIp } from '../common/utils/ip.util.js';
import { EmployeesRepository } from '../repositories/employees.repository.js';
import { AttendanceBlockingMiddleware } from '../common/middleware/attendance-blocking.middleware.js';

export class AttendanceController {
  constructor(attendanceService) {
    this.attendanceService = attendanceService;
    this.employeeRepository = new EmployeesRepository();
    this.attendanceBlockingMiddleware = new AttendanceBlockingMiddleware();
  }

  getTodayContext = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const result = await this.attendanceService.getTodayContext(userId);
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Attendance.TODAY_CONTEXT_RETRIEVED,
        result,
      );
    } catch (error) {
      next(error);
    }
  };

  getMyRecords = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const result = await this.attendanceService.getMyRecords(
        userId,
        req.query,
      );
      ResponseUtil.sendResponse(
        res,
        'Attendance records retrieved successfully',
        result,
      );
    } catch (error) {
      next(error);
    }
  };

  checkIn = async (req, res, next) => {
    const userId = req.user.id;
    const employee = await this.employeeRepository.findByUserId(userId);
    try {
      const { lat, lng } = req.body;
      const files = req.files;
      const clientIp = getClientIp(req);
      const result = await this.attendanceService.checkIn(employee.id, files, {
        lat,
        lng,
        clientIp,
      });
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Attendance.CHECKED_IN,
        result,
      );
    } catch (error) {
      await this.attendanceBlockingMiddleware.handle(error, employee.id);
      next(error);
    }
  };

  checkOut = async (req, res, next) => {
    const userId = req.user.id;
    const employee = await this.employeeRepository.findByUserId(userId);
    try {
      const clientIp = getClientIp(req);
      const { lat, lng } = req.body;
      const files = req.files;
      const result = await this.attendanceService.checkOut(employee.id, files, {
        lat,
        lng,
        clientIp,
      });
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Attendance.CHECKED_OUT,
        result,
      );
    } catch (error) {
      await this.attendanceBlockingMiddleware.handle(error, employee.id);
      next(error);
    }
  };
}
