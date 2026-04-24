import { ResponseUtil } from '../common/utils/response.util.js';
import { AppMessages } from '../common/constants/index.js';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
    CreatePayrollDto,
    UpdatePayrollDetailDto,
    UpdatePayrollDto,
    PayrollQueryDto,
    RejectPayrollDto,
} from '../models/dto/payroll/index.js';

export class PayrollController {
    constructor(payrollService) {
        this.payrollService = payrollService;
    }

    // UC27 - Create payroll batch
    create = async (req, res, next) => {
        try {
            const dto = plainToInstance(CreatePayrollDto, req.body);
            const errors = await validate(dto);
            if (errors.length > 0) {
                const message = Object.values(errors[0].constraints)[0];
                return ResponseUtil.sendResponse(res, message, null, 400);
            }
            const result = await this.payrollService.create(dto);
            ResponseUtil.sendResponse(res, AppMessages.Success.Payroll.CREATED, result, 201);
        } catch (error) { next(error); }
    };

    // UC27 - Auto-calculate payroll
    autoCalculate = async (req, res, next) => {
        try {
            const result = await this.payrollService.autoCalculate(parseInt(req.params.id));
            ResponseUtil.sendResponse(res, AppMessages.Success.Payroll.CALCULATED, result);
        } catch (error) { next(error); }
    };

    // UC27 - Edit a single employee payroll detail
    updateDetail = async (req, res, next) => {
        try {
            const dto = plainToInstance(UpdatePayrollDetailDto, req.body);
            const errors = await validate(dto);
            if (errors.length > 0) {
                const message = Object.values(errors[0].constraints)[0];
                return ResponseUtil.sendResponse(res, message, null, 400);
            }
            const result = await this.payrollService.updateDetail(parseInt(req.params.detailId), dto);
            ResponseUtil.sendResponse(res, AppMessages.Success.Payroll.UPDATED, result);
        } catch (error) { next(error); }
    };

    // UC28 - List payrolls
    findAll = async (req, res, next) => {
        try {
            const queryDto = plainToInstance(PayrollQueryDto, req.query);
            const result = await this.payrollService.findAll(queryDto);
            ResponseUtil.sendResponse(res, AppMessages.Success.Payroll.RETRIEVED_ALL, result);
        } catch (error) { next(error); }
    };

    // UC28 - Get payroll with details
    findById = async (req, res, next) => {
        try {
            const result = await this.payrollService.findById(parseInt(req.params.id));
            ResponseUtil.sendResponse(res, AppMessages.Success.Payroll.RETRIEVED, result);
        } catch (error) { next(error); }
    };

    // UC28 - Update payroll general info
    update = async (req, res, next) => {
        try {
            const dto = plainToInstance(UpdatePayrollDto, req.body, { enableImplicitConversion: true });
            const errors = await validate(dto);
            if (errors.length > 0) {
                const message = Object.values(errors[0].constraints)[0];
                return ResponseUtil.sendResponse(res, message, null, 400);
            }
            const result = await this.payrollService.update(parseInt(req.params.id), dto);
            ResponseUtil.sendResponse(res, AppMessages.Success.Payroll.UPDATED, result);
        } catch (error) { next(error); }
    };

    // UC28 - Get details by department
    getDetailsByDepartment = async (req, res, next) => {
        try {
            const result = await this.payrollService.getDetailsByDepartment(
                parseInt(req.params.id),
                parseInt(req.params.departmentId)
            );
            ResponseUtil.sendResponse(res, AppMessages.Success.Payroll.RETRIEVED, result);
        } catch (error) { next(error); }
    };

    // UC28 - Export payroll summary Excel
    exportSummary = async (req, res, next) => {
        try {
            const buffer = await this.payrollService.exportSummary(parseInt(req.params.id));
            const payrollId = req.params.id;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=payroll_summary_${payrollId}.xlsx`);
            res.setHeader('Content-Length', buffer.length);
            res.end(buffer);
        } catch (error) { next(error); }
    };

    // UC29 - Submit for approval
    submitForApproval = async (req, res, next) => {
        try {
            const result = await this.payrollService.submitForApproval(parseInt(req.params.id));
            ResponseUtil.sendResponse(res, AppMessages.Success.Payroll.SUBMITTED, result);
        } catch (error) { next(error); }
    };

    // UC29 - Approve
    approve = async (req, res, next) => {
        try {
            const result = await this.payrollService.approve(parseInt(req.params.id), req.user.id);
            ResponseUtil.sendResponse(res, AppMessages.Success.Payroll.APPROVED, result);
        } catch (error) { next(error); }
    };

    // UC29 - Reject
    reject = async (req, res, next) => {
        try {
            const dto = plainToInstance(RejectPayrollDto, req.body);
            const errors = await validate(dto);
            if (errors.length > 0) {
                const message = Object.values(errors[0].constraints)[0];
                return ResponseUtil.sendResponse(res, message, null, 400);
            }
            const result = await this.payrollService.reject(parseInt(req.params.id), req.user.id, dto.reason);
            ResponseUtil.sendResponse(res, AppMessages.Success.Payroll.REJECTED, result);
        } catch (error) { next(error); }
    };

    // UC30 - Lock payroll
    lock = async (req, res, next) => {
        try {
            const result = await this.payrollService.lock(parseInt(req.params.id));
            ResponseUtil.sendResponse(res, AppMessages.Success.Payroll.LOCKED, result);
        } catch (error) { next(error); }
    };

    unlock = async (req, res, next) => {
        try {
            const result = await this.payrollService.unlock(parseInt(req.params.id));
            ResponseUtil.sendResponse(res, AppMessages.Success.Payroll.UPDATED, result);
        } catch (error) { next(error); }
    };

    // UC30 - Send payslips
    sendPayslips = async (req, res, next) => {
        try {
            const result = await this.payrollService.sendPayslips(parseInt(req.params.id));
            ResponseUtil.sendResponse(res, AppMessages.Success.Payroll.PAYSLIPS_SENT, result);
        } catch (error) { next(error); }
    };

    // UC30 - Send selected payslips (by detailIds)
    sendPayslipsSelected = async (req, res, next) => {
        try {
            const payrollId = parseInt(req.params.id);
            const detailIds = (req.body.detailIds || []).map(Number).filter(Boolean);
            const result = await this.payrollService.sendPayslipsToSelected(payrollId, detailIds);
            ResponseUtil.sendResponse(res, AppMessages.Success.Payroll.PAYSLIPS_SENT, result);
        } catch (error) { next(error); }
    };

    // UC30 - Export payslips Excel
    exportPayslips = async (req, res, next) => {
        try {
            const buffer = await this.payrollService.exportPayslips(parseInt(req.params.id));
            const payrollId = req.params.id;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=payslips_${payrollId}.xlsx`);
            res.setHeader('Content-Length', buffer.length);
            res.end(buffer);
        } catch (error) { next(error); }
    };

    importDetails = async (req, res, next) => {
        try {
            if (!req.file) {
                return ResponseUtil.sendResponse(res, 'No file uploaded', null, 400);
            }
            const result = await this.payrollService.importDetails(parseInt(req.params.id), req.file.buffer);
            ResponseUtil.sendResponse(res, 'Imported payroll details successfully', result);
        } catch (error) { next(error); }
    };
}
