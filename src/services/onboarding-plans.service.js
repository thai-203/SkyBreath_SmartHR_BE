import { OnboardingPlansRepository } from '../repositories/onboarding-plans.repository.js';
import { OnboardingProgressRepository } from '../repositories/onboarding-progress.repository.js';
import { OnboardingTasksRepository } from '../repositories/onboarding-tasks.repository.js';
import { BadRequestException, NotFoundException, ConflictException } from '../common/exceptions/index.js';
import { AppMessages } from '../common/constants/index.js';
import { PaginatedResponseDto } from '../common/dto/index.js';

export class OnboardingPlansService {
    constructor() {
        this.plansRepository = new OnboardingPlansRepository();
        this.progressRepository = new OnboardingProgressRepository();
        this.tasksRepository = new OnboardingTasksRepository();
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
        console.log('Creating onboarding plan with data:', data);
        if (!data.planName || data.planName.trim().length === 0) {
            throw new BadRequestException(
            AppMessages.Errors.Onboarding?.PLAN_NAME_REQUIRED?.message ||
            'Plan name is required'
            );
        }

        if (data.isTemplate === 1 || data.isTemplate === true) {
            if (!data.departmentId || !data.positionId) {
                throw new BadRequestException(
                    'Department and Position are required for template plan'
                );
            }

            const existingTemplate =
            await this.plansRepository.findTemplateByDepartmentAndPosition(
                data.departmentId,
                data.positionId
            );

            if (existingTemplate) {
                throw new ConflictException(AppMessages.Errors.Onboarding.TEMPLATE_ALREADY_EXISTS);
        }
    }

    return this.plansRepository.create({
        ...data,
        createdAt: new Date(),
    });
    }


    async update(id, dto) {
        const plan = await this.plansRepository.findById(id);

        if (!plan) {
            throw new Error('Onboarding plan not found');
        }

        Object.assign(plan, {
            planName: dto.planName,
            description: dto.description,
            departmentId: dto.departmentId,
            positionId: dto.positionId,
            isTemplate: dto.isTemplate,
            durationDays: dto.durationDays,
            status: dto.status,
        });

        await this.plansRepository.save(plan);

        const existingTasks = await this.tasksRepository.findByPlanId(plan.id);

        const incomingTaskIds = (dto.tasks || [])
            .filter(t => t.id)
            .map(t => Number(t.id));

        const tasksToDelete = existingTasks.filter(
            task => !incomingTaskIds.includes(task.id)
        );

        if (tasksToDelete.length) {
            await this.tasksRepository.update(
                tasksToDelete.map(t => t.id),
                { isDeleted: true, deletedAt: new Date() }
            );
        }

        for (const taskDto of dto.tasks || []) {
            if (taskDto.id) {
                await this.tasksRepository.update(taskDto.id, {
                    taskTitle: taskDto.taskTitle,
                    description: taskDto.description,
                    category: taskDto.category,
                    estimatedDays: taskDto.estimatedDays,
                    isMandatory: taskDto.isMandatory,
                    responsibleDepartmentId: taskDto.responsibleDepartmentId,
                    taskOrder: taskDto.taskOrder,
                });
            } else {
                const newTask = this.tasksRepository.create({
                    taskTitle: taskDto.taskTitle,
                    description: taskDto.description,
                    category: taskDto.category,
                    estimatedDays: taskDto.estimatedDays,
                    isMandatory: taskDto.isMandatory,
                    responsibleDepartmentId: taskDto.responsibleDepartmentId,
                    taskOrder: taskDto.taskOrder,
                    plan: { id: plan.id },
                });

                await this.tasksRepository.save(newTask);
            }
        }

        return plan;
    }


    async remove(planId) {
        await this.findById(planId);
        await this.tasksRepository.deleteByPlanId(planId);
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
