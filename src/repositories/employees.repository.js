import { AppDataSource } from '../database/data-source.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';

export class EmployeesRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(EmployeeEntity);
    }

    async create(data) {
        const employee = this.repository.create(data);
        return this.repository.save(employee);
    }

    async findAll(options = {}) {
        const { skip = 0, take = 10, search = '', departmentId, positionId, employmentStatus } = options;
        const query = this.repository.createQueryBuilder('employee')
            .leftJoinAndSelect('employee.user', 'user')
            .leftJoinAndSelect('employee.department', 'department')
            .leftJoinAndSelect('employee.position', 'position')
            .leftJoinAndSelect('employee.jobGrade', 'jobGrade')
            .leftJoinAndSelect('employee.directManager', 'directManager')
            .leftJoinAndSelect('employee.hrMentor', 'hrMentor')
            .where('employee.isDeleted = :isDeleted', { isDeleted: false });

        if (search) {
            query.andWhere(
                '(employee.fullName LIKE :search OR employee.employeeCode LIKE :search OR employee.companyEmail LIKE :search)',
                { search: `%${search}%` }
            );
        }

        if (departmentId) {
            query.andWhere('employee.departmentId = :departmentId', { departmentId });
        }

        if (positionId) {
            query.andWhere('employee.positionId = :positionId', { positionId });
        }

        if (employmentStatus) {
            query.andWhere('employee.employmentStatus = :employmentStatus', { employmentStatus });
        }

        const [items, total] = await query
            .orderBy('employee.fullName', 'ASC')
            .skip(skip)
            .take(take)
            .getManyAndCount();

        return { items, total };
    }

    async findDropdownList(roleName = 'manager') {
        return this.repository.createQueryBuilder('employee')
            .innerJoin('employee.user', 'user')
            .innerJoin('user.userRoles', 'userRole')
            .innerJoin('userRole.role', 'role')
            .where('employee.isDeleted = :isDeleted', { isDeleted: false })
            .andWhere('LOWER(role.roleName) = :roleName', { roleName: roleName.toLowerCase() })
            .select(['employee.id', 'employee.fullName', 'employee.avatar'])
            .orderBy('employee.fullName', 'ASC')
            .getMany();
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
    async findValidationData() {
        return this.repository.find({
            where: { isDeleted: false },
            select: ['id', 'employeeCode', 'fullName', 'personalEmail', 'companyEmail', 'phoneNumber', 'nationalId']
        });
    }
}
