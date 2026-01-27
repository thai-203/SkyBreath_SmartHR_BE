import { EmployeesRepository } from '../repositories/employees.repository';
import { EmployeeEntity } from '../models/entities/employee.entity';

export class EmployeesService {
    private employeesRepository: EmployeesRepository;

    constructor() {
        this.employeesRepository = new EmployeesRepository();
    }

    async findList(): Promise<Partial<EmployeeEntity>[]> {
        return this.employeesRepository.findList();
    }
}
