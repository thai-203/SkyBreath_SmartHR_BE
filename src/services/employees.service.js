import { EmployeesRepository } from '../repositories/employees.repository.js';

export class EmployeesService {
    constructor() {
        this.employeesRepository = new EmployeesRepository();
    }

    async findAll() {
        return this.employeesRepository.findAll();
    }

    async findList() {
        return this.employeesRepository.findList();
    }
}
