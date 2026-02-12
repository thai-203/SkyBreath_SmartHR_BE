import { OnboardingPlansRepository } from '../repositories/onboarding-plans.repository.js';
import { OnboardingProgressRepository } from '../repositories/onboarding-progress.repository.js';
import { BadRequestException, NotFoundException } from '../common/exceptions/index.js';
import { AppMessages } from '../common/constants/index.js';
import { PaginatedResponseDto } from '../common/dto/index.js';

export class OnboardingPlansService {
    constructor() {
        this.plansRepository = new OnboardingPlansRepository();
        this.progressRepository = new OnboardingProgressRepository();
    }

    async findAll(queryDto) {
        const [plans, total] = await Promise.all([
            this.plansRepository.findAll(queryDto.skip, queryDto.limit),
            this.plansRepository.count()
        ]);
        return new PaginatedResponseDto(plans, total, queryDto);
    }

    async findById(planId) {
        const plan = await this.plansRepository.findById(planId);
        if (!plan) {
            throw new NotFoundException(AppMessages.Errors.Onboarding?.PLAN_NOT_FOUND?.message || `Onboarding plan with ID ${planId} not found`);
        }
        return plan;
    }

    async findByDepartment(departmentId) {
        return this.plansRepository.findByDepartmentId(departmentId);
    }

    async findTemplates() {
        return this.plansRepository.findTemplates({
            where: {
                isTemplate: true,
                isDeleted: false
            },
            relations: ['tasks', 'department', 'position']
        });
    }

    async create(data) {
        if (!data.planName || data.planName.trim().length === 0) {
            throw new BadRequestException(AppMessages.Errors.Onboarding?.PLAN_NAME_REQUIRED?.message || 'Plan name is required');
        }
        return this.plansRepository.create({
            ...data,
            createdAt: new Date(),
        });
    }

    async update(planId, data) {
        await this.findById(planId);
        const updated = await this.plansRepository.update(planId, {
            ...data,
            updatedAt: new Date(),
        });
        return updated;
    }

    async remove(planId) {
        await this.findById(planId);
        return this.plansRepository.delete(planId);
    }

    async duplicate(planId, newPlanName) {
        const plan = await this.findById(planId);
        const newPlan = {
            planName: newPlanName || `${plan.planName} (Copy)`,
            description: plan.description,
            durationDays: plan.durationDays,
            departmentId: plan.departmentId,
            positionId: plan.positionId,
            isTemplate: plan.isTemplate,
            tasks: plan.tasks?.map(task => ({
                ...task,
                id: undefined,
                createdAt: undefined,
                updatedAt: undefined,
            }))
        };
        return this.plansRepository.create(newPlan);
    }

    async getStatistics(planId) {
        const plan = await this.findById(planId);
        const progressRecords = await this.progressRepository.findAll(0, 1000);
        const planProgressRecords = progressRecords.plans.filter(p => p.planId === planId);
        
        return {
            planId,
            planName: plan.planName,
            totalTasksPerPlan: plan.tasks?.length || 0,
            activeOnboardings: planProgressRecords.filter(p => p.overallStatus === 'IN_PROGRESS').length,
            completedOnboardings: planProgressRecords.filter(p => p.overallStatus === 'COMPLETED').length,
            onHoldOnboardings: planProgressRecords.filter(p => p.overallStatus === 'ON_HOLD').length,
        };
    }
}
