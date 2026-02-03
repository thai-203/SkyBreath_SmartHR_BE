import { ContractsService } from '../services/contracts.service.js';
import { CreateContractDto, UpdateContractDto, ContractQueryDto } from '../models/dto/contracts/index.js';
import { plainToInstance } from 'class-transformer';
import { AppMessages } from '../common/constants/index.js';

export class ContractsController {
    constructor() {
        this.contractsService = new ContractsService();
    }

    create = async (req, res, next) => {
        try {
            const createDto = plainToInstance(CreateContractDto, req.body);
            const contract = await this.contractsService.create(createDto);
            res.status(201).json({
                success: true,
                data: contract,
                message: AppMessages.Success.Contract.CREATED,
            });
        } catch (error) {
            next(error);
        }
    };

    findAll = async (req, res, next) => {
        try {
            const queryDto = plainToInstance(ContractQueryDto, req.query);
            const result = await this.contractsService.findAll(queryDto);
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
            const contract = await this.contractsService.findById(id);
            res.status(200).json({
                success: true,
                data: contract,
            });
        } catch (error) {
            next(error);
        }
    };

    findByEmployee = async (req, res, next) => {
        try {
            const employeeId = parseInt(req.params.employeeId);
            const contracts = await this.contractsService.findByEmployeeId(employeeId);
            res.status(200).json({
                success: true,
                data: contracts,
            });
        } catch (error) {
            next(error);
        }
    };

    update = async (req, res, next) => {
        try {
            const id = parseInt(req.params.id);
            const updateDto = plainToInstance(UpdateContractDto, req.body);
            const contract = await this.contractsService.update(id, updateDto);
            res.status(200).json({
                success: true,
                data: contract,
                message: AppMessages.Success.Contract.UPDATED,
            });
        } catch (error) {
            next(error);
        }
    };

    terminate = async (req, res, next) => {
        try {
            const id = parseInt(req.params.id);
            const terminationData = req.body;
            const contract = await this.contractsService.terminate(id, terminationData);
            res.status(200).json({
                success: true,
                data: contract,
                message: AppMessages.Success.Contract.TERMINATED,
            });
        } catch (error) {
            next(error);
        }
    };

    remove = async (req, res, next) => {
        try {
            const id = parseInt(req.params.id);
            await this.contractsService.remove(id);
            res.status(200).json({
                success: true,
                message: AppMessages.Success.Contract.DELETED,
            });
        } catch (error) {
            next(error);
        }
    };

    search = async (req, res, next) => {
        try {
            const keyword = req.query.keyword;
            const results = await this.contractsService.searchContracts(keyword);
            res.status(200).json({
                success: true,
                data: results,
            });
        } catch (error) {
            next(error);
        }
    };

    getByStatus = async (req, res, next) => {
        try {
            const status = req.params.status;
            const contracts = await this.contractsService.getContractsByStatus(status);
            res.status(200).json({
                success: true,
                data: contracts,
            });
        } catch (error) {
            next(error);
        }
    };

    getExpired = async (req, res, next) => {
        try {
            const expiredContracts = await this.contractsService.getExpiredContracts();
            res.status(200).json({
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
            const buffer = await this.contractsService.exportExcel(queryDto);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=contracts.xlsx');
            res.setHeader('Content-Length', buffer.length);
            res.end(buffer);
        } catch (error) {
            next(error);
        }
    };
}
