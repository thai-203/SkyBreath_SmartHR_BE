import { DepartmentsRepository } from '../repositories/departments.repository';
import { CreateDepartmentDto, UpdateDepartmentDto, DepartmentQueryDto } from '../models/dto/departments';
import { DepartmentEntity } from '../models/entities/department.entity';
import { NotFoundException } from '../common/exceptions';
import { AppMessages } from '../common/constants';
import { PaginatedResponseDto } from '../common/dto';
import { ExcelUtil } from '../common/utils/excel.util';

export class DepartmentsService {
    private departmentsRepository: DepartmentsRepository;

    constructor() {
        this.departmentsRepository = new DepartmentsRepository();
    }

    async create(createDto: CreateDepartmentDto): Promise<DepartmentEntity> {
        return this.departmentsRepository.create(createDto);
    }

    async findAll(queryDto: DepartmentQueryDto): Promise<PaginatedResponseDto<DepartmentEntity>> {
        const [departments, total] = await this.departmentsRepository.findAll(queryDto);
        return new PaginatedResponseDto(departments, total, queryDto);
    }

    async findById(id: number): Promise<DepartmentEntity> {
        const department = await this.departmentsRepository.findById(id);
        if (!department) {
            throw new NotFoundException(AppMessages.Errors.Department.NOT_FOUND);
        }
        return department;
    }

    async update(id: number, updateDto: UpdateDepartmentDto): Promise<DepartmentEntity> {
        await this.findById(id);
        return this.departmentsRepository.update(id, updateDto);
    }

    async remove(id: number): Promise<void> {
        await this.findById(id);
        await this.departmentsRepository.delete(id);
    }

    async getOrgChart(): Promise<any[]> {
        const departments = await this.departmentsRepository.findWithChildren();
        return this.buildTree(departments);
    }


    async exportExcel(): Promise<Buffer> {
        const [departments] = await this.departmentsRepository.findAll({ limit: 10000, page: 1 } as DepartmentQueryDto);

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

    async findList(): Promise<Partial<DepartmentEntity>[]> {
        return this.departmentsRepository.findList();
    }

    private buildTree(departments: DepartmentEntity[], parentId: number | null = null): any[] {
        return departments
            .filter(d => d.parentDepartmentId === parentId)
            .map(d => ({
                ...d,
                children: this.buildTree(departments, d.id),
            }));
    }
}
