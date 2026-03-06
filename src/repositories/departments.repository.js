import { AppDataSource } from '../database/data-source.js';
import { DepartmentEntity } from '../models/entities/department.entity.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { Like } from 'typeorm';

export class DepartmentsRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(DepartmentEntity);
    }

    async create(data) {
        const department = this.repository.create(data);
        return this.repository.save(department);
    }

    async findAll(queryDto) {
        const { skip, limit, sortBy, sortOrder, search, parentDepartmentId, managerEmployeeId, hasEmployees } = queryDto;

        const query = this.repository.createQueryBuilder('department')
            .leftJoinAndSelect('department.parentDepartment', 'parentDepartment')
            .leftJoinAndSelect('department.manager', 'manager')
            .where('department.isDeleted = :isDeleted', { isDeleted: false });

        if (search) {
            query.andWhere('department.departmentName LIKE :search', { search: `%${search}%` });
        }

        if (parentDepartmentId) {
            query.andWhere('department.parentDepartmentId = :parentDepartmentId', { parentDepartmentId });
        }

        if (managerEmployeeId) {
            query.andWhere('department.managerEmployeeId = :managerEmployeeId', { managerEmployeeId });
        }

        if (hasEmployees === 'true' || hasEmployees === 'false') {
            const hasEmp = hasEmployees === 'true';
            const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
            const subQuery = employeeRepo.createQueryBuilder('employee')
                .select('employee.departmentId')
                .where('employee.isDeleted = :isDeleted', { isDeleted: false })
                .groupBy('employee.departmentId');

            if (hasEmp) {
                query.andWhere(`department.id IN (${subQuery.getQuery()})`)
                    .setParameters(subQuery.getParameters());
            } else {
                query.andWhere(`department.id NOT IN (${subQuery.getQuery()})`)
                    .setParameters(subQuery.getParameters());
            }
        }

        if (sortBy) {
            query.orderBy(`department.${sortBy}`, sortOrder || 'DESC');
        } else {
            query.orderBy('department.createdAt', 'DESC');
        }

        const [items, total] = await query
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        // Add employee count to each item
        const employeeRepository = AppDataSource.getRepository(EmployeeEntity);
        const itemsWithCount = await Promise.all(items.map(async (item) => {
            const employeeCount = await employeeRepository.count({
                where: { departmentId: item.id, isDeleted: false }
            });
            return { ...item, employeeCount };
        }));

        return [itemsWithCount, total];
    }

    async findById(id) {
        const department = await this.repository.findOne({
            where: { id, isDeleted: false },
            relations: ['parentDepartment', 'manager'],
        });

        if (department) {
            const employeeRepository = AppDataSource.getRepository(EmployeeEntity);
            department.employeeCount = await employeeRepository.count({
                where: { departmentId: department.id, isDeleted: false }
            });

            // Get children
            department.children = await this.repository.find({
                where: { parentDepartmentId: department.id, isDeleted: false },
                relations: ['manager']
            });
        }

        return department;
    }

    async update(id, data) {
        await this.repository.update(id, data);
        const updated = await this.findById(id);
        if (!updated) {
            throw new Error('Department not found');
        }
        return updated;
    }

    async delete(id) {
        await this.repository.update(id, {
            isDeleted: true,
            deletedAt: new Date(),
        });
    }

    async findWithChildren() {
        return this.repository.find({
            where: { isDeleted: false },
            relations: ['parentDepartment', 'manager'],
        });
    }

    async findList() {
        return this.repository.find({
            where: { isDeleted: false },
            select: ['id', 'departmentName'],
            order: { departmentName: 'ASC' },
        });
    }

    async findByName(name) {
        return this.repository.findOne({
            where: { departmentName: name, isDeleted: false },
        });
    }

    async hasChildren(id) {
        const count = await this.repository.count({
            where: { parentDepartmentId: id, isDeleted: false }
        });
        return count > 0;
    }

    async hasEmployees(id) {
        const employeeRepository = AppDataSource.getRepository(EmployeeEntity);
        const count = await employeeRepository.count({
            where: { departmentId: id, isDeleted: false }
        });
        return count > 0;
    }
}
