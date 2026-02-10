import { AppDataSource } from '../database/data-source.js';
import { OnboardingPlanEntity } from '../models/entities/onboarding-plan.entity.js';
import { OnboardingTaskEntity } from '../models/entities/onboarding-task.entity.js';

export class OnboardingPlansRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(OnboardingPlanEntity);
        this.taskRepository = AppDataSource.getRepository(OnboardingTaskEntity);
    }

    async findAll(skip = 0, take = 10) {
        return this.repository.find({
            relations: ['department', 'tasks'],
            where: { isDeleted: false },
            skip,
            take,
            order: { createdAt: 'DESC' }
        });
    }

    async findById(id) {
        return this.repository.findOne({
            where: { id, isDeleted: false },
            relations: ['department', 'tasks']
        });
    }

    async findByDepartmentId(departmentId) {
        return this.repository.find({
            where: { departmentId, isDeleted: false },
            relations: ['tasks']
        });
    }

    async findTemplates() {
        return this.repository.find({
            where: {
                isTemplate: true,
                isDeleted: false
            },
            relations: [
                'tasks',
                'department',
                'position'
            ]
        });
    }

    async create(data) {
        const plan = this.repository.create(data);
        return this.repository.save(plan);
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
}
