import { AppDataSource } from '../database/data-source';
import { DepartmentEntity } from '../models/entities/department.entity';
import { DepartmentQueryDto } from '../models/dto/departments';
import { FindOptionsWhere, Like } from 'typeorm';

export class DepartmentsRepository {
    private repository = AppDataSource.getRepository(DepartmentEntity);

    async create(data: Partial<DepartmentEntity>): Promise<DepartmentEntity> {
        const department = this.repository.create(data);
        return this.repository.save(department);
    }

    async findAll(queryDto: DepartmentQueryDto): Promise<[DepartmentEntity[], number]> {
        const { skip, limit, sortBy, sortOrder, search } = queryDto;

        const order: any = {};
        if (sortBy) {
            order[sortBy] = sortOrder;
        } else {
            order.createdAt = 'DESC';
        }

        const where: FindOptionsWhere<DepartmentEntity> = {
            isDeleted: false,
        };

        if (search) {
            where.departmentName = Like(`%${search}%`);
        }

        return this.repository.findAndCount({
            where,
            relations: ['parentDepartment', 'manager'],
            order,
            skip,
            take: limit,
        });
    }

    async findById(id: number): Promise<DepartmentEntity | null> {
        return this.repository.findOne({
            where: { id, isDeleted: false },
            relations: ['parentDepartment', 'manager'],
        });
    }

    async update(id: number, data: Partial<DepartmentEntity>): Promise<DepartmentEntity> {
        await this.repository.update(id, data);
        const updated = await this.findById(id);
        if (!updated) {
            throw new Error('Department not found');
        }
        return updated;
    }

    async delete(id: number): Promise<void> {
        await this.repository.update(id, {
            isDeleted: true,
            deletedAt: new Date(),
        });
    }

    async findWithChildren(): Promise<DepartmentEntity[]> {
        return this.repository.find({
            where: { isDeleted: false },
            relations: ['parentDepartment', 'manager'],
        });
    }

    async findList(): Promise<Partial<DepartmentEntity>[]> {
        return this.repository.find({
            where: { isDeleted: false },
            select: ['id', 'departmentName'],
            order: { departmentName: 'ASC' },
        });
    }
}
