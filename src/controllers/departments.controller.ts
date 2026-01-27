import { Request, Response, NextFunction } from 'express';
import { DepartmentsService } from '../services/departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto, DepartmentQueryDto } from '../models/dto/departments';
import { plainToInstance } from 'class-transformer';
import { AppMessages } from '../common/constants';

export class DepartmentsController {
    private departmentsService: DepartmentsService;

    constructor() {
        this.departmentsService = new DepartmentsService();
    }

    create = async (req: Request, res: Response, next: NextFunction) => {
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

    findAll = async (req: Request, res: Response, next: NextFunction) => {
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

    findOne = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id as string);
            const department = await this.departmentsService.findById(id);
            res.status(200).json({
                success: true,
                data: department,
            });
        } catch (error) {
            next(error);
        }
    };

    update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id as string);
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

    remove = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id as string);
            await this.departmentsService.remove(id);
            res.status(200).json({
                success: true,
                message: AppMessages.Success.Department.DELETED,
            });
        } catch (error) {
            next(error);
        }
    };

    getOrgChart = async (req: Request, res: Response, next: NextFunction) => {
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


    export = async (req: Request, res: Response, next: NextFunction) => {
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

    list = async (req: Request, res: Response, next: NextFunction) => {
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
