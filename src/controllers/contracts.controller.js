import { ContractsService } from '../services/contracts.service.js';
import {
    CreateContractDto,
    UpdateContractDto,
    ContractQueryDto,
} from '../models/dto/contracts/index.js';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { AppMessages } from '../common/constants/index.js';

export class ContractsController {
    constructor() {
        this.contractsService = new ContractsService();
    }

    /* ================= CREATE ================= */
    create = async (req, res, next) => {
        try {
            const dto = plainToInstance(CreateContractDto, req.body);
            await validateOrReject(dto);

            const contract = await this.contractsService.create(dto);

            return res.status(201).json({
                success: true,
                data: contract,
                message:
                    AppMessages?.Success?.Contract?.CREATED ??
                    'Contract created successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    /* ================= READ ================= */
    findAll = async (req, res, next) => {
        try {
            const queryDto = plainToInstance(ContractQueryDto, req.query);
            const { data, meta } = await this.contractsService.findAll(queryDto);

            return res.status(200).json({
                success: true,
                data,
                meta,
            });
        } catch (error) {
            next(error);
        }
    };

    findOne = async (req, res, next) => {
        try {
            const id = Number(req.params.id);
            const contract = await this.contractsService.findById(id);

            return res.status(200).json({
                success: true,
                data: contract,
            });
        } catch (error) {
            next(error);
        }
    };

    findByEmployee = async (req, res, next) => {
        try {
            const employeeId = Number(req.params.employeeId);
            const contracts =
                await this.contractsService.findByEmployeeId(employeeId);

            return res.status(200).json({
                success: true,
                data: contracts,
            });
        } catch (error) {
            next(error);
        }
    };

    /* ================= UPDATE ================= */
    update = async (req, res, next) => {
        try {
            const numberFields = [
                'employeeId',
                'departmentId',
                'positionId',
                'jobGradeId',
                'workingHours',
                'baseSalary',
                'performanceSalary',
                'phoneAllowance',
                'lunchAllowance',
                'fuelAllowance',
                'otherAllowance',
            ];

            numberFields.forEach((field) => {
                if (req.body[field] !== undefined) {
                    req.body[field] = Number(req.body[field]);
                }
            });

            const dto = plainToInstance(UpdateContractDto, req.body);
            await validateOrReject(dto);

            const result = await this.contractsService.update(
                Number(req.params.id),
                dto
            );

            return res.status(200).json({
                success: true,
                data: result,
                message:
                    AppMessages?.Success?.Contract?.UPDATED ??
                    'Contract updated successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    terminate = async (req, res, next) => {
        try {
            const contractId = Number(req.params.id);
            const result = await this.contractsService.terminate(
                contractId,
                req.body,
                req.user.id
            );

            return res.status(200).json({
                success: true,
                data: result,
                message: 'Contract terminated successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    /* ================= DELETE ================= */
    remove = async (req, res, next) => {
        try {
            const id = Number(req.params.id);
            await this.contractsService.remove(id);

            return res.status(200).json({
                success: true,
                message:
                    AppMessages?.Success?.Contract?.DELETED ??
                    'Contract deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    /* ================= EXTRA ================= */
    search = async (req, res, next) => {
        try {
            const { keyword } = req.query;
            const results =
                await this.contractsService.searchContracts(keyword);

            return res.status(200).json({
                success: true,
                data: results,
            });
        } catch (error) {
            next(error);
        }
    };

    getByStatus = async (req, res, next) => {
        try {
            const { status } = req.params;
            const contracts =
                await this.contractsService.getContractsByStatus(status);

            return res.status(200).json({
                success: true,
                data: contracts,
            });
        } catch (error) {
            next(error);
        }
    };

    getExpired = async (req, res, next) => {
        try {
            const expiredContracts =
                await this.contractsService.getExpiredContracts();

            return res.status(200).json({
                success: true,
                data: expiredContracts,
            });
        } catch (error) {
            next(error);
        }
    };

    export = async (req, res, next) => {
        try {
            const queryDto = plainToInstance(ContractQueryDto, req.query);
            const buffer =
                await this.contractsService.exportExcel(queryDto);

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                'attachment; filename=contracts.xlsx'
            );
            res.setHeader('Content-Length', buffer.length);

            return res.end(buffer);
        } catch (error) {
            next(error);
        }
    };
}
