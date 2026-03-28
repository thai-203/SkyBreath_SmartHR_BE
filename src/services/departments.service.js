import { DepartmentsRepository } from '../repositories/departments.repository.js';
import { NotFoundException, ConflictException } from '../common/exceptions/index.js';
import { AppMessages } from '../common/constants/index.js';
import { PaginatedResponseDto } from '../common/dto/index.js';
import { ExcelUtil } from '../common/utils/excel.util.js';

export class DepartmentsService {
    constructor() {
        this.departmentsRepository = new DepartmentsRepository();
    }

    async create(createDto) {
        if (createDto.departmentName) {
            createDto.departmentName = this.normalizeName(createDto.departmentName);
        }
        const existing = await this.departmentsRepository.findByName(createDto.departmentName);
        if (existing) {
            throw new ConflictException(AppMessages.Errors.Department.ALREADY_EXISTS);
        }
        return this.departmentsRepository.create(createDto);
    }

    async findAll(queryDto) {
        const [departments, total] = await this.departmentsRepository.findAll(queryDto);
        return new PaginatedResponseDto(departments, total, queryDto);
    }

    async findById(id) {
        const department = await this.departmentsRepository.findById(id);
        if (!department) {
            throw new NotFoundException(AppMessages.Errors.Department.NOT_FOUND);
        }
        return department;
    }

    async update(id, updateDto) {
        await this.findById(id);

        if (updateDto.departmentName) {
            updateDto.departmentName = this.normalizeName(updateDto.departmentName);
            const existing = await this.departmentsRepository.findByName(updateDto.departmentName);
            if (existing && existing.id !== id) {
                throw new ConflictException(AppMessages.Errors.Department.ALREADY_EXISTS);
            }
        }

        if (updateDto.parentDepartmentId) {
            if (updateDto.parentDepartmentId === id) {
                throw new ConflictException(AppMessages.Errors.Department.SAME_AS_PARENT);
            }

            let currentParentId = updateDto.parentDepartmentId;
            while (currentParentId) {
                const parent = await this.departmentsRepository.findById(currentParentId);
                if (!parent || !parent.parentDepartment) break;

                if (parent.parentDepartment.id === id) {
                    throw new ConflictException(AppMessages.Errors.Department.CIRCULAR_DEPENDENCY);
                }
                currentParentId = parent.parentDepartment.id;
            }
        }

        return this.departmentsRepository.update(id, updateDto);
    }

    async remove(id) {
        await this.findById(id);

        const hasChildren = await this.departmentsRepository.hasChildren(id);
        if (hasChildren) {
            throw new ConflictException(AppMessages.Errors.Department.HAS_CHILDREN);
        }

        const hasEmployees = await this.departmentsRepository.hasEmployees(id);
        if (hasEmployees) {
            throw new ConflictException(AppMessages.Errors.Department.HAS_EMPLOYEES);
        }

        await this.departmentsRepository.delete(id);
    }

    async getOrgChart() {
        const departments = await this.departmentsRepository.findWithChildren();
        return this.buildTree(departments);
    }


    async exportExcel() {
        const [departments] = await this.departmentsRepository.findAll({ limit: 10000, page: 1 });

        const data = departments.map((d, index) => ({
            index: index + 1,
            name: d.departmentName,
            parent: d.parentDepartment?.departmentName || '',
            manager: d.manager?.fullName || '',
        }));

        const columns = [
            { header: 'STT', key: 'index', width: 10 },
            { header: 'Tên phòng ban', key: 'name', width: 30 },
            { header: 'Phòng ban cha', key: 'parent', width: 30 },
            { header: 'Quản lý', key: 'manager', width: 30 },
        ];

        return ExcelUtil.export(data, columns, 'Danh sách phòng ban');
    }

    async findList() {
        return this.departmentsRepository.findList();
    }

    buildTree(departments, parentId = null) {
        return departments
            .filter(d => d.parentDepartmentId === parentId)
            .map(d => {
                const children = this.buildTree(departments, d.id);
                // Tính tổng bao gồm cả department con (đệ quy)
                const totalEmployeeCount = (d.employeeCount || 0) + children.reduce((sum, c) => sum + (c.totalEmployeeCount || 0), 0);
                const totalProbationCount = (d.probationCount || 0) + children.reduce((sum, c) => sum + (c.totalProbationCount || 0), 0);
                return {
                    ...d,
                    children,
                    totalEmployeeCount,
                    totalProbationCount,
                };
            });
    }

    normalizeName = (name) => {
        return name
            .trim()
            .replace(/\s+/g, ' ');
    }

}
