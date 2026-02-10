import { AppDataSource } from '../database/data-source.js';
import { OnboardingProgressEntity } from '../models/entities/onboarding-progress.entity.js';

export class OnboardingProgressRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(OnboardingProgressEntity);
    }

    async findAll(skip = 0, take = 10) {
        return this.repository.find({
            relations: ['employee', 'plan', 'assignedMentor', 'taskAssignments'],
            where: { isDeleted: false },
            skip,
            take,
            order: { createdAt: 'DESC' }
        });
    }

    async findById(id) {
        return this.repository.findOne({
            where: { id, isDeleted: false },
            relations: ['employee', 'plan', 'assignedMentor', 'taskAssignments']
        });
    }

    async findByEmployeeId(employeeId) {
        return this.repository.findOne({
            where: { employeeId, isDeleted: false },
            relations: ['employee', 'plan', 'assignedMentor', 'taskAssignments']
        });
    }

    async findByEmployeeAndPlan(employeeId, planId) {
        return this.repository.findOne({
            where: { employeeId, planId, isDeleted: false },
            relations: ['employee', 'plan', 'assignedMentor', 'taskAssignments']
        });
    }

    async findInProgressByDepartment(departmentId) {
        return this.repository.createQueryBuilder('progress')
            .leftJoinAndSelect('progress.employee', 'employee')
            .leftJoinAndSelect('progress.plan', 'plan')
            .leftJoinAndSelect('progress.assignedMentor', 'mentor')
            .where('progress.overallStatus = :status', { status: 'IN_PROGRESS' })
            .andWhere('employee.departmentId = :departmentId', { departmentId })
            .andWhere('progress.isDeleted = :isDeleted', { isDeleted: false })
            .orderBy('progress.createdAt', 'DESC')
            .getMany();
    }

    async create(data) {
        const progress = this.repository.create(data);
        return this.repository.save(progress);
    }

    async update(id, data) {
        await this.repository.update(id, data);
        return this.findById(id);
    }

    async delete(id) {
        return this.repository.update(id, { isDeleted: true });
    }

    async count() {
        return this.repository.count({ where: { isDeleted: false } });
    }

    async countByStatus(status) {
        return this.repository.count({ 
            where: { overallStatus: status, isDeleted: false } 
        });
    }
}
