import { AppDataSource } from '../database/data-source.js';
import { DepartmentTransfersRepository } from '../repositories/department-transfers.repository.js';
import { DepartmentsRepository } from '../repositories/departments.repository.js';
import { DepartmentTransferEntity } from '../models/entities/department-transfer.entity.js';
import { DepartmentTransferDetailEntity } from '../models/entities/department-transfer-detail.entity.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { DepartmentEntity } from '../models/entities/department.entity.js';
import { NotFoundException, BadRequestException } from '../common/exceptions/index.js';
import { AppMessages } from '../common/constants/index.js';

export class DepartmentTransfersService {
    constructor() {
        this.departmentTransfersRepository = new DepartmentTransfersRepository();
        this.departmentsRepository = new DepartmentsRepository();
    }

    async bulkTransfer(createDto, userId) {
        const { fromDepartmentId, toDepartmentId, employeeIds, reason, effectiveDate, note } = createDto;

        if (fromDepartmentId === toDepartmentId) {
            throw new BadRequestException(AppMessages.Errors.DepartmentTransfer.SAME_DEPARTMENT);
        }

        const fromDepartment = await this.departmentsRepository.findById(fromDepartmentId);
        if (!fromDepartment) {
            throw new NotFoundException(AppMessages.Errors.Department.NOT_FOUND);
        }

        const toDepartment = await this.departmentsRepository.findById(toDepartmentId);
        if (!toDepartment) {
            throw new NotFoundException(AppMessages.Errors.Department.NOT_FOUND);
        }

        return await AppDataSource.transaction(async (manager) => {
            const employeeRepo = manager.getRepository(EmployeeEntity);
            const deptRepo = manager.getRepository(DepartmentEntity);
            const transferRepo = manager.getRepository(DepartmentTransferEntity);
            const detailRepo = manager.getRepository(DepartmentTransferDetailEntity);

            const employees = await employeeRepo.createQueryBuilder('employee')
                .where('employee.id IN (:...employeeIds)', { employeeIds })
                .andWhere('employee.isDeleted = :isDeleted', { isDeleted: false })
                .getMany();

            if (employees.length !== employeeIds.length) {
                throw new BadRequestException('Một số nhân viên không tồn tại hoặc đã bị xóa');
            }

            for (const emp of employees) {
                if (emp.departmentId !== fromDepartmentId) {
                    throw new BadRequestException(AppMessages.Errors.DepartmentTransfer.EMPLOYEE_NOT_IN_DEPARTMENT);
                }
                if (emp.employmentStatus !== 'ACTIVE' && emp.employmentStatus !== 'PROBATION') {
                    throw new BadRequestException(AppMessages.Errors.DepartmentTransfer.INVALID_EMPLOYEE_STATUS);
                }
            }

            const todayTransfersCount = await this.departmentTransfersRepository.countTodayTransfers();
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const sequenceStr = String(todayTransfersCount + 1).padStart(3, '0');
            const transferCode = `TRF-${dateStr}-${sequenceStr}`;

            const transfer = transferRepo.create({
                transferCode,
                fromDepartmentId,
                toDepartmentId,
                reason,
                effectiveDate,
                note,
                transferredBy: userId,
                totalEmployees: employees.length
            });

            const savedTransfer = await transferRepo.save(transfer);

            const details = employees.map(emp => {
                return detailRepo.create({
                    transferId: savedTransfer.id,
                    employeeId: emp.id,
                    previousPositionId: emp.positionId,
                    previousDirectManagerId: emp.directManagerId
                });
            });

            await detailRepo.save(details);

            for (const emp of employees) {
                emp.departmentId = toDepartmentId;
            }
            await employeeRepo.save(employees);

            const currentFromDept = await deptRepo.findOne({ where: { id: fromDepartmentId } });
            if (currentFromDept && employeeIds.includes(currentFromDept.managerEmployeeId)) {
                currentFromDept.managerEmployeeId = null;
                await deptRepo.save(currentFromDept);
            }

            return {
                ...savedTransfer,
                transferredCount: employees.length
            };
        });
    }

    async findAll(queryDto) {
        const [items, total] = await this.departmentTransfersRepository.findAll(queryDto);
        return {
            items,
            total,
            page: queryDto.page,
            limit: queryDto.limit,
            totalPages: Math.ceil(total / queryDto.limit),
        };
    }

    async findById(id) {
        const transfer = await this.departmentTransfersRepository.findById(id);
        if (!transfer) {
            throw new NotFoundException(AppMessages.Errors.DepartmentTransfer.NOT_FOUND);
        }
        return transfer;
    }
}
