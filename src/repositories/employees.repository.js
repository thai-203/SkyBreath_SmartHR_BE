import { AppDataSource } from '../database/data-source.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';

export class EmployeesRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(EmployeeEntity);
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
}
