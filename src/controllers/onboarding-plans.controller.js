import { OnboardingPlansService } from '../services/onboarding-plans.service.js';
import { ResponseUtil } from '../common/utils/response.util.js';

export class OnboardingPlansController {
    constructor() {
        this.plansService = new OnboardingPlansService();
    }

    list = async (req, res, next) => {
        console.log("Listing onboarding plans...");
        try {
            const { skip = 0, take = 10 } = req.query;
            const result = await this.plansService.getAllPlans(parseInt(skip), parseInt(take));
            return ResponseUtil.successResponse(res, 200, result, 'Onboarding plans retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getById = async (req, res, next) => {
        try {
            const { id } = req.params;
            const plan = await this.plansService.getPlanById(id);
            return ResponseUtil.successResponse(res, 200, plan, 'Onboarding plan retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getByDepartment = async (req, res, next) => {
        try {
            const { departmentId } = req.params;
            const plans = await this.plansService.getPlansByDepartment(departmentId);
            return ResponseUtil.successResponse(res, 200, plans, 'Department onboarding plans retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getTemplates = async (req, res, next) => {
        try {
            const templates = await this.plansService.findTemplates();
            return ResponseUtil.successResponse(res, 200, templates, 'Onboarding templates retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    create = async (req, res, next) => {
        try {
            const data = {
                ...req.body,
                createdBy: req.user?.id,
            };
            const plan = await this.plansService.createPlan(data);
            return ResponseUtil.successResponse(res, 201, plan, 'Onboarding plan created successfully');
        } catch (error) {
            next(error);
        }
    };

    update = async (req, res, next) => {
        try {
            const { id } = req.params;
            const plan = await this.plansService.updatePlan(id, req.body);
            return ResponseUtil.successResponse(res, 200, plan, 'Onboarding plan updated successfully');
        } catch (error) {
            next(error);
        }
    };

    delete = async (req, res, next) => {
        try {
            const { id } = req.params;
            await this.plansService.deletePlan(id);
            return ResponseUtil.successResponse(res, 200, null, 'Onboarding plan deleted successfully');
        } catch (error) {
            next(error);
        }
    };

    duplicate = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { newPlanName } = req.body;
            const plan = await this.plansService.duplicatePlan(id, newPlanName);
            return ResponseUtil.successResponse(res, 201, plan, 'Onboarding plan duplicated successfully');
        } catch (error) {
            next(error);
        }
    };

    getStats = async (req, res, next) => {
        try {
            const { id } = req.params;
            const stats = await this.plansService.getPlanStats(id);
            return ResponseUtil.successResponse(res, 200, stats, 'Plan statistics retrieved successfully');
        } catch (error) {
            next(error);
        }
    };
}
