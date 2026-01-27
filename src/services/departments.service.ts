import { DepartmentsRepository } from '../repositories/departments.repository';
import { CreateDepartmentDto, UpdateDepartmentDto, DepartmentQueryDto } from '../models/dto/departments';
import { DepartmentEntity } from '../models/entities/department.entity';
import { NotFoundException } from '../common/exceptions';
import { AppMessages } from '../common/constants';
import { PaginatedResponseDto } from '../common/dto';

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

    async exportCsv(): Promise<string> {
        const [departments] = await this.departmentsRepository.findAll({ limit: 1000, page: 1 } as DepartmentQueryDto);
        const header = 'ID,Department Name,Parent Department,Manager\n';
        const rows = departments.map(d =>
            `${d.id},"${d.departmentName}","${d.parentDepartment?.departmentName || ''}","${d.manager?.fullName || ''}"`
        ).join('\n');
        return header + rows;
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
