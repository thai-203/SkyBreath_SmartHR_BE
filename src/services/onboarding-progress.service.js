import { OnboardingProgressRepository } from '../repositories/onboarding-progress.repository.js';
import { OnboardingPlansRepository } from '../repositories/onboarding-plans.repository.js';
import { TaskAssignmentsRepository } from '../repositories/task-assignments.repository.js';
import { NotFoundException, BadRequestException } from '../common/exceptions/index.js';
import { AppMessages } from '../common/constants/index.js';
import { PaginatedResponseDto } from '../common/dto/index.js';

export class OnboardingProgressService {
    constructor() {
        this.progressRepository = new OnboardingProgressRepository();
        this.plansRepository = new OnboardingPlansRepository();
        this.taskAssignmentsRepository = new TaskAssignmentsRepository();
    }

    async findAll(queryDto) {
        const [progress, total] = await Promise.all([
            this.progressRepository.findAll(queryDto.skip, queryDto.limit),
            this.progressRepository.count()
        ]);
        return new PaginatedResponseDto(progress, total, queryDto);
    }

    async findById(progressId) {
        const progress = await this.progressRepository.findById(progressId);
        if (!progress) {
            throw new NotFoundException(AppMessages.Errors.Onboarding?.PROGRESS_NOT_FOUND?.message || `Onboarding progress with ID ${progressId} not found`);
        }
        return progress;
    }

    async findByEmployee(employeeId) {
        const progress = await this.progressRepository.findByEmployeeId(employeeId);
        if (!progress) {
            throw new NotFoundException(AppMessages.Errors.Onboarding?.PROGRESS_NOT_FOUND?.message || `No onboarding progress found for employee ${employeeId}`);
        }
        return progress;
    }

    async create(employeeId, planId, assignedMentorId = null) {
        const plan = await this.plansRepository.findById(planId);
        if (!plan) {
            throw new NotFoundException(AppMessages.Errors.Onboarding?.PLAN_NOT_FOUND?.message || `Plan with ID ${planId} not found`);
        }

        const existingProgress = await this.progressRepository.findByEmployeeAndPlan(employeeId, planId);
        if (existingProgress) {
            throw new BadRequestException(AppMessages.Errors.Onboarding?.PROGRESS_ALREADY_EXISTS?.message || 'Employee already has onboarding progress for this plan');
        }

        const startDate = new Date();
        const expectedEndDate = new Date(startDate);
        expectedEndDate.setDate(expectedEndDate.getDate() + plan.durationDays);

        return this.progressRepository.create({
            employeeId,
            planId,
            overallStatus: 'IN_PROGRESS',
            startDate,
            expectedEndDate,
            assignedMentorId,
            progressPercentage: 0,
            completedTasksCount: 0,
            totalTasksCount: plan.tasks?.length || 0,
        });
    }

    async update(progressId, data) {
        await this.findById(progressId);
        return this.progressRepository.update(progressId, {
            ...data,
            updatedAt: new Date(),
        });
    }

    async updateProgressPercentage(progressId) {
        const progress = await this.findById(progressId);
        const assignments = await this.taskAssignmentsRepository.findByProgressId(progressId);
        
        if (assignments.length === 0) {
            return progress;
        }

        const completedCount = assignments.filter(a => a.status === 'COMPLETED').length;
        const percentage = Math.round((completedCount / assignments.length) * 100);

        return this.progressRepository.update(progressId, {
            progressPercentage: percentage,
            completedTasksCount: completedCount,
            totalTasksCount: assignments.length,
            updatedAt: new Date(),
        });
    }

    async complete(progressId) {
        await this.findById(progressId);
        
        return this.progressRepository.update(progressId, {
            overallStatus: 'COMPLETED',
            actualEndDate: new Date(),
            updatedAt: new Date(),
        });
    }

    async pause(progressId) {
        await this.findById(progressId);
        
        return this.progressRepository.update(progressId, {
            overallStatus: 'ON_HOLD',
            updatedAt: new Date(),
        });
    }

    async resume(progressId) {
        const progress = await this.findById(progressId);
        
        if (progress.overallStatus !== 'ON_HOLD') {
            throw new BadRequestException(AppMessages.Errors.Onboarding?.CANNOT_RESUME?.message || 'Only paused onboarding can be resumed');
        }

        return this.progressRepository.update(progressId, {
            overallStatus: 'IN_PROGRESS',
            updatedAt: new Date(),
        });
    }

    async findByDepartment(departmentId) {
        return this.progressRepository.findInProgressByDepartment(departmentId);
    }

    async getStatistics() {
        const [totalProgress, inProgressCount, completedCount, onHoldCount] = await Promise.all([
            this.progressRepository.count(),
            this.progressRepository.countByStatus('IN_PROGRESS'),
            this.progressRepository.countByStatus('COMPLETED'),
            this.progressRepository.countByStatus('ON_HOLD'),
        ]);

        return {
            totalOnboardings: totalProgress,
            inProgress: inProgressCount,
            completed: completedCount,
            onHold: onHoldCount,
            averageCompletionRate: totalProgress > 0 ? Math.round((completedCount / totalProgress) * 100) : 0,
        };
    }
}
