import { AppDataSource } from '../database/data-source';
import { EmployeeEntity } from '../models/entities/employee.entity';

export class EmployeesRepository {
    private repository = AppDataSource.getRepository(EmployeeEntity);

    async findList(): Promise<Partial<EmployeeEntity>[]> {
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
