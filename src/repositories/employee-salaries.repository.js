import { AppDataSource } from '../database/data-source.js';
import { EmployeeSalaryEntity } from '../models/entities/employee-salary.entity.js';

export class EmployeeSalariesRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(EmployeeSalaryEntity);
    }

    async findAll() {
        return this.repository.find({
            where: { isDeleted: false },
            order: { createdAt: 'DESC' },
            relations: ['employee'],
        });
    }

    async findById(id) {
        return this.repository.findOne({
            where: { id, isDeleted: false },
            relations: ['employee'],
        });
    }

    async findByEmployeeId(employeeId) {
        return this.repository.findOne({
            where: { 
                employeeId: employeeId, 
                isDeleted: false 
            },
            order: { createdAt: 'DESC' },
            relations: ['employee'],
        });
    }

    async create(data) {
        const employeeSalary = this.repository.create(data);
        return this.repository.save(employeeSalary);
    }

    async update(id, data) {
        await this.repository.update(id, data);
        return this.findById(id);
    }

    async delete(id) {
        await this.repository.update(id, {
            isDeleted: true,
            deletedAt: new Date(),
        });
    }

    async findList() {
        return this.repository.find({
            select: {
                id: true,
                employeeId: true,
                baseSalary: true,
            },
            where: { isDeleted: false },
            order: { createdAt: 'DESC' },
        });
    }
}