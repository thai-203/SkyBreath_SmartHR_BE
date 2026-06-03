import { DepartmentTransfersService } from '../services/department-transfers.service.js';
import { CreateDepartmentTransferDto, DepartmentTransferQueryDto } from '../models/dto/department-transfers/index.js';
import { plainToInstance } from 'class-transformer';
import { AppMessages } from '../common/constants/index.js';

export class DepartmentTransfersController {
    constructor() {
        this.departmentTransfersService = new DepartmentTransfersService();
    }

    create = async (req, res, next) => {
        try {
            const createDto = plainToInstance(CreateDepartmentTransferDto, req.body);
            const userId = req.user.id;
            const result = await this.departmentTransfersService.bulkTransfer(createDto, userId);
            
            res.status(201).json({
                success: true,
                data: result,
                message: AppMessages.Success.DepartmentTransfer.TRANSFERRED,
            });
        } catch (error) {
            next(error);
        }
    };

    findAll = async (req, res, next) => {
        try {
            const queryDto = plainToInstance(DepartmentTransferQueryDto, req.query);
            const result = await this.departmentTransfersService.findAll(queryDto);
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
            const transfer = await this.departmentTransfersService.findById(id);
            res.status(200).json({
                success: true,
                data: transfer,
            });
        } catch (error) {
            next(error);
        }
    };
}
