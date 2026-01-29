import { DepartmentsService } from '../services/departments.service.js';
import { CreateDepartmentDto, UpdateDepartmentDto, DepartmentQueryDto } from '../models/dto/departments/index.js';
import { plainToInstance } from 'class-transformer';
import { AppMessages } from '../common/constants/index.js';

export class DepartmentsController {
    constructor() {
        this.departmentsService = new DepartmentsService();
    }

    create = async (req, res, next) => {
        try {
            const createDto = plainToInstance(CreateDepartmentDto, req.body);
            const department = await this.departmentsService.create(createDto);
            res.status(201).json({
                success: true,
                data: department,
                message: AppMessages.Success.Department.CREATED,
            });
        } catch (error) {
            next(error);
        }
    };

    findAll = async (req, res, next) => {
        try {
            const queryDto = plainToInstance(DepartmentQueryDto, req.query);
            const result = await this.departmentsService.findAll(queryDto);
            res.status(200).json({
                success: true,
                ...result,
            });
        } catch (error) {
            next(error);
        }
    };

    findOne = async (req, res, next) => {
        try {
            const id = parseInt(req.params.id);
            const department = await this.departmentsService.findById(id);
            res.status(200).json({
                success: true,
                data: department,
            });
        } catch (error) {
            next(error);
        }
    };

    update = async (req, res, next) => {
        try {
            const id = parseInt(req.params.id);
            const updateDto = plainToInstance(UpdateDepartmentDto, req.body);
            const department = await this.departmentsService.update(id, updateDto);
            res.status(200).json({
                success: true,
                data: department,
                message: AppMessages.Success.Department.UPDATED,
            });
        } catch (error) {
            next(error);
        }
    };

    remove = async (req, res, next) => {
        try {
            const id = parseInt(req.params.id);
            await this.departmentsService.remove(id);
            res.status(200).json({
                success: true,
                message: AppMessages.Success.Department.DELETED,
            });
        } catch (error) {
            next(error);
        }
    };

    getOrgChart = async (req, res, next) => {
        try {
            const chart = await this.departmentsService.getOrgChart();
            res.status(200).json({
                success: true,
                data: chart,
            });
        } catch (error) {
            next(error);
        }
    };


    export = async (req, res, next) => {
        try {
            const buffer = await this.departmentsService.exportExcel();
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=departments.xlsx');
            res.setHeader('Content-Length', buffer.length);
            res.end(buffer);
        } catch (error) {
            next(error);
        }
    };

    list = async (req, res, next) => {
        try {
            const list = await this.departmentsService.findList();
            res.status(200).json({
                success: true,
                data: list,
            });
        } catch (error) {
            next(error);
        }
    };
}
