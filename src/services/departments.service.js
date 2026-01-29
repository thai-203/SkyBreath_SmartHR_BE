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
            const existing = await this.departmentsRepository.findByName(updateDto.departmentName);
            if (existing && existing.id !== id) {
                throw new ConflictException(AppMessages.Errors.Department.ALREADY_EXISTS);
            }
        }

        return this.departmentsRepository.update(id, updateDto);
    }

    async remove(id) {
        await this.findById(id);
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
            .map(d => ({
                ...d,
                children: this.buildTree(departments, d.id),
            }));
    }
}
