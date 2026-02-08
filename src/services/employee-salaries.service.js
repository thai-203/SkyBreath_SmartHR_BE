import { EmployeeSalariesRepository } from '../repositories/employee-salaries.repository.js';

export class EmployeeSalariesService {
    constructor() {
        this.employeeSalariesRepository = new EmployeeSalariesRepository();
    }

    async findAll() {
        return this.employeeSalariesRepository.findAll();
    }

    async findById(id) {
        return this.employeeSalariesRepository.findById(id);
    }

    async findByEmployeeId(employeeId) {
        return this.employeeSalariesRepository.findByEmployeeId(employeeId);
    }

    async create(data) {
        return this.employeeSalariesRepository.create(data);
    }

    async update(id, data) {
        return this.employeeSalariesRepository.update(id, data);
    }

    async remove(id) {
        return this.employeeSalariesRepository.delete(id);
    }

    async findList() {
        return this.employeeSalariesRepository.findList();
    }
}
