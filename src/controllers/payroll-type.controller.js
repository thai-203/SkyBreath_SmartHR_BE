import { PayrollTypeService } from '../services/payroll-type.service.js';
import { CreatePayrollTypeDto, UpdatePayrollTypeDto, PayrollTypeQueryDto } from '../models/dto/payroll-type/index.js';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export class PayrollTypeController {
    constructor() {
        this.payrollTypeService = new PayrollTypeService();
    }

    getAll = async (req, res, next) => {
        try {
            const queryDto = plainToInstance(PayrollTypeQueryDto, req.query);
            const errors = await validate(queryDto);
            if (errors.length > 0) {
                return res.status(400).json({ message: 'Validation failed', errors });
            }
            const result = await this.payrollTypeService.getAll(queryDto);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    getById = async (req, res, next) => {
        try {
            const result = await this.payrollTypeService.getById(parseInt(req.params.id));
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    create = async (req, res, next) => {
        try {
            const createDto = plainToInstance(CreatePayrollTypeDto, req.body);
            const errors = await validate(createDto);
            if (errors.length > 0) {
                return res.status(400).json({ message: 'Validation failed', errors });
            }
            const result = await this.payrollTypeService.create(createDto, req.user.id);
            res.status(201).json({
                message: 'Tạo loại bảng lương thành công',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    update = async (req, res, next) => {
        try {
            const updateDto = plainToInstance(UpdatePayrollTypeDto, req.body);
            const errors = await validate(updateDto);
            if (errors.length > 0) {
                return res.status(400).json({ message: 'Validation failed', errors });
            }
            const result = await this.payrollTypeService.update(parseInt(req.params.id), updateDto);
            res.status(200).json({
                message: 'Cập nhật loại bảng lương thành công',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    delete = async (req, res, next) => {
        try {
            await this.payrollTypeService.delete(parseInt(req.params.id));
            res.status(200).json({
                message: 'Xóa loại bảng lương thành công',
            });
        } catch (error) {
            next(error);
        }
    };
}
