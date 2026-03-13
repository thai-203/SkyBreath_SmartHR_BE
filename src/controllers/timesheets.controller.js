import { ResponseUtil } from '../common/utils/response.util.js';
import { AppMessages } from '../common/constants/index.js';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GenerateTimesheetDto, TimesheetQueryDto, UpdateTimesheetDto } from '../models/dto/timesheets/index.js';

export class TimesheetsController {
    constructor(timesheetsService) {
        this.timesheetsService = timesheetsService;
    }

    generate = async (req, res, next) => {
        try {
            const dto = plainToInstance(GenerateTimesheetDto, req.body);
            const errors = await validate(dto);
            if (errors.length > 0) {
                const message = Object.values(errors[0].constraints)[0];
                return ResponseUtil.sendResponse(res, message, null, 400);
            }
            const result = await this.timesheetsService.generate(dto);
            ResponseUtil.sendResponse(res, AppMessages.Success.Timesheet.GENERATED, result);
        } catch (error) {
            next(error);
        }
    };

    findAll = async (req, res, next) => {
        try {
            const queryDto = plainToInstance(TimesheetQueryDto, req.query);
            const result = await this.timesheetsService.findAll(queryDto, req.user);
            ResponseUtil.sendResponse(res, AppMessages.Success.Timesheet.RETRIEVED_ALL, result);
        } catch (error) {
            next(error);
        }
    };

    findById = async (req, res, next) => {
        try {
            const result = await this.timesheetsService.findById(parseInt(req.params.id), req.user);
            ResponseUtil.sendResponse(res, AppMessages.Success.Timesheet.RETRIEVED, result);
        } catch (error) {
            next(error);
        }
    };

    getAttendanceDetails = async (req, res, next) => {
        try {
            const result = await this.timesheetsService.getAttendanceDetails(parseInt(req.params.id), req.user);
            ResponseUtil.sendResponse(res, AppMessages.Success.Timesheet.RETRIEVED, result);
        } catch (error) {
            next(error);
        }
    };

    recalculate = async (req, res, next) => {
        try {
            const result = await this.timesheetsService.recalculate(parseInt(req.params.id), req.user);
            ResponseUtil.sendResponse(res, AppMessages.Success.Timesheet.RECALCULATED, result);
        } catch (error) {
            next(error);
        }
    };

    update = async (req, res, next) => {
        try {
            const dto = plainToInstance(UpdateTimesheetDto, req.body);
            const errors = await validate(dto);
            if (errors.length > 0) {
                const message = Object.values(errors[0].constraints)[0];
                return ResponseUtil.sendResponse(res, message, null, 400);
            }
            const result = await this.timesheetsService.update(parseInt(req.params.id), dto, req.user);
            ResponseUtil.sendResponse(res, AppMessages.Success.Timesheet.UPDATED, result);
        } catch (error) {
            next(error);
        }
    };

    lock = async (req, res, next) => {
        try {
            const result = await this.timesheetsService.lock(parseInt(req.params.id), req.user);
            ResponseUtil.sendResponse(res, AppMessages.Success.Timesheet.LOCKED, result);
        } catch (error) {
            next(error);
        }
    };

    unlock = async (req, res, next) => {
        try {
            const result = await this.timesheetsService.unlock(parseInt(req.params.id), req.user);
            ResponseUtil.sendResponse(res, AppMessages.Success.Timesheet.UNLOCKED, result);
        } catch (error) {
            next(error);
        }
    };

    exportSummary = async (req, res, next) => {
        try {
            const { month, year, departmentId } = req.query;
            const buffer = await this.timesheetsService.exportSummary(
                parseInt(month), parseInt(year), departmentId ? parseInt(departmentId) : undefined, req.user
            );
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=timesheet_summary_${month}_${year}.xlsx`);
            res.setHeader('Content-Length', buffer.length);
            res.end(buffer);
        } catch (error) {
            next(error);
        }
    };

    exportDetailed = async (req, res, next) => {
        try {
            const { month, year, employeeId } = req.query;
            const buffer = await this.timesheetsService.exportDetailed(
                parseInt(month), parseInt(year), employeeId ? parseInt(employeeId) : undefined, req.user
            );
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=attendance_detail_${month}_${year}.xlsx`);
            res.setHeader('Content-Length', buffer.length);
            res.end(buffer);
        } catch (error) {
            next(error);
        }
    };
}
