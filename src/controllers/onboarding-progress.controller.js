import { OnboardingProgressService } from '../services/onboarding-progress.service.js';
import { ResponseUtil } from '../common/utils/response.util.js';

export class OnboardingProgressController {
    constructor() {
        this.progressService = new OnboardingProgressService();
    }

    list = async (req, res, next) => {
        try {
            const { skip = 0, take = 10 } = req.query;
            const result = await this.progressService.getAllProgress(parseInt(skip), parseInt(take));
            return ResponseUtil.successResponse(res, 200, result, 'Onboarding progress retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getById = async (req, res, next) => {
        try {
            const { id } = req.params;
            const progress = await this.progressService.getProgressById(id);
            return ResponseUtil.successResponse(res, 200, progress, 'Onboarding progress retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getByEmployee = async (req, res, next) => {
        try {
            const { employeeId } = req.params;
            const progress = await this.progressService.getEmployeeProgress(employeeId);
            return ResponseUtil.successResponse(res, 200, progress, 'Employee onboarding progress retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    startOnboarding = async (req, res, next) => {
        try {
            const { employeeId, planId, assignedMentorId } = req.body;
            const progress = await this.progressService.startOnboarding(employeeId, planId, assignedMentorId);
            return ResponseUtil.successResponse(res, 201, progress, 'Onboarding started successfully');
        } catch (error) {
            next(error);
        }
    };

    update = async (req, res, next) => {
        try {
            const { id } = req.params;
            const progress = await this.progressService.updateProgress(id, req.body);
            return ResponseUtil.successResponse(res, 200, progress, 'Onboarding progress updated successfully');
        } catch (error) {
            next(error);
        }
    };

    complete = async (req, res, next) => {
        try {
            const { id } = req.params;
            const progress = await this.progressService.completeOnboarding(id);
            return ResponseUtil.successResponse(res, 200, progress, 'Onboarding completed successfully');
        } catch (error) {
            next(error);
        }
    };

    pause = async (req, res, next) => {
        try {
            const { id } = req.params;
            const progress = await this.progressService.pauseOnboarding(id);
            return ResponseUtil.successResponse(res, 200, progress, 'Onboarding paused successfully');
        } catch (error) {
            next(error);
        }
    };

    resume = async (req, res, next) => {
        try {
            const { id } = req.params;
            const progress = await this.progressService.resumeOnboarding(id);
            return ResponseUtil.successResponse(res, 200, progress, 'Onboarding resumed successfully');
        } catch (error) {
            next(error);
        }
    };

    getByDepartment = async (req, res, next) => {
        try {
            const { departmentId } = req.params;
            const progress = await this.progressService.getProgressByDepartment(departmentId);
            return ResponseUtil.successResponse(res, 200, progress, 'Department onboarding progress retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getStats = async (req, res, next) => {
        try {
            const stats = await this.progressService.getProgressStats();
            return ResponseUtil.successResponse(res, 200, stats, 'Progress statistics retrieved successfully');
        } catch (error) {
            next(error);
        }
    };
}
