import { AppDataSource } from '../database/data-source.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';

export class EmployeesRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(EmployeeEntity);
    }

    async findAll() {
    return this.repository
        .createQueryBuilder('employee')
        .leftJoinAndSelect('employee.user', 'user')
        .leftJoinAndSelect('employee.department', 'department')
        .leftJoinAndSelect('employee.position', 'position')
        .where('employee.isDeleted = :isDeleted', { isDeleted: false })
        .orderBy('employee.fullName', 'ASC')
        .getMany();
    }

    async findList() {
        return this.repository.createQueryBuilder('employee')
            .innerJoin('employee.user', 'user')
            .innerJoin('user.userRoles', 'userRole')
            .innerJoin('userRole.role', 'role')
            .where('employee.isDeleted = :isDeleted', { isDeleted: false })
            .andWhere('role.roleName = :roleName', { roleName: 'MANAGER' })
            .select(['employee.id', 'employee.fullName'])
            .orderBy('employee.fullName', 'ASC')
            .getMany();
    }

    async findById(id) {
        return this.repository.findOne({
            where: { id, isDeleted: false },
            relations: ['user', 'department', 'position', 'jobGrade', 'directManager', 'hrMentor'],
        });
    }
}
