import { ContractsRepository } from '../repositories/contracts.repository.js';
import { EmployeesRepository } from '../repositories/employees.repository.js';
import { NotFoundException, ConflictException, BadRequestException } from '../common/exceptions/index.js';
import { AppMessages } from '../common/constants/index.js';
import { PaginatedResponseDto } from '../common/dto/index.js';
import { ExcelUtil } from '../common/utils/excel.util.js';

export class ContractsService {
    constructor() {
        this.contractsRepository = new ContractsRepository();
        this.employeesRepository = new EmployeesRepository();
    }

    async create(createDto) {
        // Verify employee exists
        const employee = await this.employeesRepository.findById(createDto.employeeId);
        if (!employee) {
            throw new NotFoundException(AppMessages.Errors.Employee.NOT_FOUND);
        }

        // Generate contract number if not provided
        if (!createDto.contractNumber) {
            createDto.contractNumber = `CT-${Date.now()}-${uuidv4().substring(0, 8)}`;
        }

        // Check if contract number already exists
        const existing = await this.contractsRepository.findByContractNumber(createDto.contractNumber);
        if (existing) {
            throw new ConflictException(AppMessages.Errors.Contract.ALREADY_EXISTS);
        }

        // Validate dates
        if (createDto.endDate && new Date(createDto.startDate) >= new Date(createDto.endDate)) {
            throw new BadRequestException('End date must be after start date');
        }

        return this.contractsRepository.create(createDto);
    }

    async findAll(queryDto) {
        const [contracts, total] = await this.contractsRepository.findAll(queryDto);
        return new PaginatedResponseDto(contracts, total, queryDto);
    }

    async findById(id) {
        const contract = await this.contractsRepository.findById(id);
        if (!contract) {
            throw new NotFoundException(AppMessages.Errors.Contract.NOT_FOUND);
        }
        return contract;
    }

    async findByEmployeeId(employeeId) {
        // Verify employee exists
        const employee = await this.employeesRepository.findById(employeeId);
        if (!employee) {
            throw new NotFoundException(AppMessages.Errors.Employee.NOT_FOUND);
        }

        return this.contractsRepository.findByEmployeeId(employeeId);
    }

    async update(id, updateDto) {
        await this.findById(id);

        // If updating contract number, check for duplicates
        if (updateDto.contractNumber) {
            const existing = await this.contractsRepository.findByContractNumber(updateDto.contractNumber);
            if (existing && existing.id !== id) {
                throw new ConflictException(AppMessages.Errors.Contract.ALREADY_EXISTS);
            }
        }

        // Validate dates
        if (updateDto.endDate) {
            const contract = await this.findById(id);
            const startDate = new Date(updateDto.startDate || contract.startDate);
            const endDate = new Date(updateDto.endDate);

            if (startDate >= endDate) {
                throw new BadRequestException('End date must be after start date');
            }
        }

        return this.contractsRepository.update(id, updateDto);
    }

    async terminate(id, terminationData) {
        const contract = await this.findById(id);

        if (contract.contractStatus === 'Terminated') {
            throw new BadRequestException('Contract is already terminated');
        }

        const updateData = {
            contractStatus: 'Terminated',
            endDate: terminationData.terminationDate || new Date(),
        };

        return this.contractsRepository.update(id, updateData);
    }

    async remove(id) {
        await this.findById(id);
        await this.contractsRepository.delete(id);
    }

    async searchContracts(keyword) {
        if (!keyword || keyword.trim().length === 0) {
            throw new BadRequestException('Search keyword cannot be empty');
        }

        return this.contractsRepository.search(keyword);
    }

    async getContractsByStatus(status) {
        return this.contractsRepository.findByStatus(status);
    }

    async getExpiredContracts() {
        return this.contractsRepository.findExpiredContracts();
    }

    async exportExcel(queryDto) {
        // Get all contracts matching query
        const queryDtoForExport = { ...queryDto, limit: 10000, page: 1 };
        const [contracts] = await this.contractsRepository.findAll(queryDtoForExport);

        const data = contracts.map((contract, index) => ({
            index: index + 1,
            contractNumber: contract.contractNumber,
            employeeName: contract.employee?.fullName || '',
            department: contract.employee?.department?.departmentName || '',
            position: contract.employee?.position?.positionName || '',
            contractType: contract.contractType,
            startDate: this.formatDate(contract.startDate),
            endDate: contract.endDate ? this.formatDate(contract.endDate) : 'N/A',
            workingHours: contract.workingHours || '',
            contractStatus: contract.contractStatus,
            signedDate: contract.signedDate ? this.formatDate(contract.signedDate) : '',
        }));

        const columns = [
            { header: 'STT', key: 'index', width: 8 },
            { header: 'Mã hợp đồng', key: 'contractNumber', width: 20 },
            { header: 'Tên nhân viên', key: 'employeeName', width: 25 },
            { header: 'Phòng ban', key: 'department', width: 20 },
            { header: 'Vị trí', key: 'position', width: 20 },
            { header: 'Loại hợp đồng', key: 'contractType', width: 15 },
            { header: 'Ngày bắt đầu', key: 'startDate', width: 15 },
            { header: 'Ngày kết thúc', key: 'endDate', width: 15 },
            { header: 'Giờ làm việc', key: 'workingHours', width: 12 },
            { header: 'Trạng thái', key: 'contractStatus', width: 15 },
            { header: 'Ngày ký', key: 'signedDate', width: 15 },
        ];

        return ExcelUtil.export(data, columns, 'Danh sách hợp đồng');
    }

    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
}
