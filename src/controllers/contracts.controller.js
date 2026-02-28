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

    _prepareAndValidateData(data) {
        const numberFields = [
            'employeeId', 'departmentId', 'positionId', 'jobGradeId',
            'workingHours', 'baseSalary', 'performanceSalary',
            'phoneAllowance', 'lunchAllowance', 'fuelAllowance',
            'otherAllowance', 'terminationCompensation',
        ];

        const financialFields = [
            'baseSalary', 'performanceSalary', 'phoneAllowance', 
            'lunchAllowance', 'fuelAllowance', 'otherAllowance'
        ];

        numberFields.forEach((field) => {
            if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
                const val = Number(data[field]);
                
                if (isNaN(val)) {
                    throw new Error(`Trường ${field} phải là một số hợp lệ.`);
                }

                // Validate không cho phép số âm đối với các khoản tiền và giờ làm
                if (val < 0) {
                    throw new Error(`Giá trị của ${field} không được nhỏ hơn 0.`);
                }

                data[field] = val;
            }
        });

        // Logic nghiệp vụ: Lương cơ bản không được bằng 0 hoặc rỗng
        if (data.baseSalary !== undefined && data.baseSalary <= 0) {
            throw new Error('Lương cơ bản phải lớn hơn 0.');
        }

        return data;
    }

    /* ================= CREATE ================= */
    create = async (req, res, next) => {
        try {
            let dtoData = { ...req.body };
            const files = req.files || [];

            // 1. Kiểm tra trùng số hợp đồng trước khi xử lý nặng
            const existingContract = await this.contractsService.findByContractNumber(dtoData.contractNumber);
            if (existingContract) {
                return res.status(400).json({
                    success: false,
                    message: 'Số hợp đồng này đã tồn tại.',
                });
            }

            // 2. Parse số và validate lương/phụ phí
            try {
                dtoData = this._prepareAndValidateData(dtoData);
            } catch (error) {
                return res.status(400).json({ success: false, message: error.message });
            }

            // 3. Xử lý attachments
            dtoData.attachments = files.length > 0 
                ? files.map(file => file.path.replace(/\\/g, '/')) 
                : null;

            // 4. Validate bằng Class-Validator
            const dto = plainToInstance(CreateContractDto, dtoData);
            await validateOrReject(dto);

            const contract = await this.contractsService.create(dto);

            return res.status(201).json({
                success: true,
                data: contract,
                message: 'Tạo hợp đồng thành công',
            });
        } catch (error) {
            next(error);
        }
    };

    /* ================= UPDATE ================= */
    update = async (req, res, next) => {
        try {
            const id = Number(req.params.id);
            let dtoData = { ...req.body };
            const files = req.files || [];

            // 1. Xử lý EndDate rỗng
            if (dtoData.endDate === '') {
                dtoData.endDate = null;
            }

            // 2. Parse số và validate lương/phụ phí
            try {
                dtoData = this._prepareAndValidateData(dtoData);
            } catch (error) {
                return res.status(400).json({ success: false, message: error.message });
            }

            // 3. Xử lý attachments (Kết hợp cũ và mới)
            let oldAttachments = [];
            if (dtoData.oldAttachments) {
                try {
                    oldAttachments = JSON.parse(dtoData.oldAttachments);
                    if (!Array.isArray(oldAttachments)) oldAttachments = [];
                } catch (err) {
                    oldAttachments = [];
                }
            }

            const validOldAttachments = oldAttachments.filter(
                (path) => typeof path === 'string' && path.trim().length > 0
            );

            const newAttachments = files.map((file) =>
                file.path.replace(/\\/g, '/')
            );

            dtoData.attachments = [...validOldAttachments, ...newAttachments];

            // 4. Validate bằng Class-Validator
            const dto = plainToInstance(UpdateContractDto, dtoData);
            await validateOrReject(dto, {
                whitelist: true,
                forbidNonWhitelisted: false,
            });

            const result = await this.contractsService.update(id, dto);

            return res.status(200).json({
                success: true,
                data: result,
                message: AppMessages?.Success?.Contract?.UPDATED ?? 'Cập nhật thành công',
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
