import { TaskAssignmentsRepository } from '../repositories/task-assignments.repository.js';
import { OnboardingProgressService } from './onboarding-progress.service.js';
import { NotFoundException, BadRequestException } from '../common/exceptions/index.js';

export class TaskAssignmentsService {
    constructor() {
        this.assignmentsRepository = new TaskAssignmentsRepository();
        this.progressService = new OnboardingProgressService();
    }

    async getAllAssignments(skip = 0, take = 10) {
        return this.assignmentsRepository.findAll(skip, take);
    }

    async getAssignmentById(assignmentId) {
        const assignment = await this.assignmentsRepository.findById(assignmentId);
        if (!assignment) {
            throw new NotFoundException(`Task assignment with ID ${assignmentId} not found`);
        }
        return assignment;
    }

    async getAssignmentsByProgress(progressId) {
        return this.assignmentsRepository.findByProgressId(progressId);
    }

    async getAssignmentsByEmployee(employeeId) {
        return this.assignmentsRepository.findByAssignedEmployee(employeeId);
    }

    async getAssignmentsByStatus(status) {
        return this.assignmentsRepository.findByStatus(status);
    }

    async getOverdueAssignments() {
        return this.assignmentsRepository.findOverdueAssignments();
    }

    async createAssignment(data, userId) {
        if (!data.progressId || !data.taskId) {
            throw new BadRequestException('Progress ID and Task ID are required');
        }

        const assignment = await this.assignmentsRepository.create({
            ...data,
            assignedByUserId: userId,
            assignedDate: new Date(),
            status: 'PENDING',
        });

        // Update progress percentage
        await this.progressService.updateProgressPercentage(data.progressId);

        return assignment;
    }

    async updateAssignment(assignmentId, data) {
        const assignment = await this.getAssignmentById(assignmentId);
        const updated = await this.assignmentsRepository.update(assignmentId, {
            ...data,
            updatedAt: new Date(),
        });

        if (data.status) {
            await this.progressService.updateProgressPercentage(assignment.progressId);
        }

        return updated;
    }

    async completeAssignment(assignmentId, notes = '') {
        const assignment = await this.getAssignmentById(assignmentId);
        
        const updated = await this.assignmentsRepository.update(assignmentId, {
            status: 'COMPLETED',
            completionDate: new Date(),
            notes: notes || assignment.notes,
            updatedAt: new Date(),
        });

        // Update progress percentage
        await this.progressService.updateProgressPercentage(assignment.progressId);

        return updated;
    }

    async startAssignment(assignmentId) {
        const assignment = await this.getAssignmentById(assignmentId);
        
        return this.assignmentsRepository.update(assignmentId, {
            status: 'IN_PROGRESS',
            updatedAt: new Date(),
        });
    }

    async reassignAssignment(assignmentId, newEmployeeId) {
        const assignment = await this.getAssignmentById(assignmentId);
        
        return this.assignmentsRepository.update(assignmentId, {
            assignedToEmployeeId: newEmployeeId,
            status: 'PENDING',
            updatedAt: new Date(),
        });
    }

    async deleteAssignment(assignmentId) {
        const assignment = await this.getAssignmentById(assignmentId);
        return this.assignmentsRepository.delete(assignmentId);
    }

    async getAssignmentStats() {
        const [pendingCount, inProgressCount, completedCount, overdueCount] = await Promise.all([
            this.assignmentsRepository.countByStatus('PENDING'),
            this.assignmentsRepository.countByStatus('IN_PROGRESS'),
            this.assignmentsRepository.countByStatus('COMPLETED'),
            this.assignmentsRepository.findOverdueAssignments().then(a => a.length),
        ]);

        return {
            pending: pendingCount,
            inProgress: inProgressCount,
            completed: completedCount,
            overdue: overdueCount,
        };
    }
}
