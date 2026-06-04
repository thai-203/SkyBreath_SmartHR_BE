import { ResponseUtil } from '../common/utils/response.util.js';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AppDataSource } from '../database/data-source.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import {
    CreatePerformanceReviewDto,
    UpdatePerformanceReviewDto,
    PerformanceReviewQueryDto,
} from '../models/dto/performance-reviews/index.js';

export class PerformanceReviewsController {
    constructor(performanceReviewsService) {
        this.performanceReviewsService = performanceReviewsService;
    }

    findAll = async (req, res, next) => {
        try {
            const queryDto = plainToInstance(PerformanceReviewQueryDto, req.query, {
                enableImplicitConversion: true,
            });
            const result = await this.performanceReviewsService.findAll(queryDto, req.user);
            ResponseUtil.sendResponse(res, 'Lấy danh sách đánh giá thành công', result);
        } catch (error) {
            next(error);
        }
    };

    findById = async (req, res, next) => {
        try {
            const result = await this.performanceReviewsService.findById(
                parseInt(req.params.id),
            );
            ResponseUtil.sendResponse(res, 'Lấy chi tiết đánh giá thành công', result);
        } catch (error) {
            next(error);
        }
    };

    getManagedEmployees = async (req, res, next) => {
        try {
            // Lấy userId từ req.user, tìm employeeId tương ứng
            const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
            const employee = await employeeRepo.findOne({
                where: { userId: req.user.id },
            });

            if (!employee) {
                return ResponseUtil.sendResponse(res, 'Không tìm thấy nhân viên', []);
            }

            const result = await this.performanceReviewsService.getManagedEmployees(employee.id, req.user);
            ResponseUtil.sendResponse(res, 'Lấy danh sách nhân viên thành công', result);
        } catch (error) {
            next(error);
        }
    };

    create = async (req, res, next) => {
        try {
            const dto = plainToInstance(CreatePerformanceReviewDto, req.body);
            const errors = await validate(dto);

            if (errors.length > 0) {
                const message = Object.values(errors[0].constraints)[0];
                return ResponseUtil.sendResponse(res, message, null, 400);
            }

            // Lấy employeeId từ userId
            const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
            const employee = await employeeRepo.findOne({
                where: { userId: req.user.id },
            });

            if (!employee) {
                return ResponseUtil.sendResponse(res, 'Không tìm thấy nhân viên', null, 400);
            }

            const result = await this.performanceReviewsService.create(dto, { employeeId: employee.id }, req.user);
            ResponseUtil.sendResponse(res, 'Tạo đánh giá thành công', result);
        } catch (error) {
            next(error);
        }
    };

    update = async (req, res, next) => {
        try {
            const dto = plainToInstance(UpdatePerformanceReviewDto, req.body);
            const errors = await validate(dto);

            if (errors.length > 0) {
                const message = Object.values(errors[0].constraints)[0];
                return ResponseUtil.sendResponse(res, message, null, 400);
            }

            const result = await this.performanceReviewsService.update(
                parseInt(req.params.id),
                dto,
                req.user,
            );
            ResponseUtil.sendResponse(res, 'Cập nhật đánh giá thành công', result);
        } catch (error) {
            next(error);
        }
    };

    delete = async (req, res, next) => {
        try {
            await this.performanceReviewsService.delete(parseInt(req.params.id), req.user);
            ResponseUtil.sendResponse(res, 'Xóa đánh giá thành công', null);
        } catch (error) {
            next(error);
        }
    };
}
