import { AppDataSource } from '../database/data-source.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';

export class EmployeesRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(EmployeeEntity);
    }

    async findList(options = {}) {
        const { skip = 0, take = 10, search = '' } = options;
        const query = this.repository.createQueryBuilder('employee')
            .leftJoinAndSelect('employee.user', 'user')
            .leftJoinAndSelect('employee.department', 'department')
            .leftJoinAndSelect('employee.position', 'position')
            .where('employee.isDeleted = :isDeleted', { isDeleted: false });

        if (search) {
            query.andWhere('employee.fullName LIKE :search', { search: `%${search}%` });
        }

        const [items, total] = await query
            .orderBy('employee.fullName', 'ASC')
            .skip(skip)
            .take(take)
            .getManyAndCount();

        return { items, total };
    }

    async findById(id) {
        return this.repository.findOne({
            where: { id, isDeleted: false },
            relations: ['user', 'department', 'position', 'jobGrade', 'directManager', 'hrMentor']
        });
    }

    async update(id, data) {
        await this.repository.update(id, data);
        return this.findById(id);
    }

    async softDelete(id) {
        return this.repository.update(id, {
            isDeleted: true,
            deletedAt: new Date()
        });
    }

    async findByField(field, value, excludeId = null) {
        const query = this.repository.createQueryBuilder('employee')
            .where(`employee.${field} = :value`, { value })
            .andWhere('employee.isDeleted = :isDeleted', { isDeleted: false });

        if (excludeId) {
            query.andWhere('employee.id != :excludeId', { excludeId });
        }

        return query.getOne();
    }

    async findById(id) {
        return this.repository.findOne({
            where: { id, isDeleted: false },
            relations: ['user', 'department', 'position', 'jobGrade', 'directManager', 'hrMentor'],
        });
    }
}
