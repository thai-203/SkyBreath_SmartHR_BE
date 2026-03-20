import { BaseResponseDto } from '../common/dto/index.js';
import { HolidayConfigService } from '../services/holiday-configs.service.js';

export class HolidayConfigController {
    constructor() {
        this.service = new HolidayConfigService();
    }

    async getConfig(req, res, next) {
        try {
            const result = await this.service.getConfig();
            res.json(new BaseResponseDto(result, 'Holiday configuration fetched successfully'));
        } catch (error) {
            next(error);
        }
    }

    async updateConfig(req, res, next) {
        try {
            const result = await this.service.updateConfig(req.body);
            res.json(new BaseResponseDto(result, 'Holiday configuration updated successfully'));
        } catch (error) {
            next(error);
        }
    }

    async triggerReminders(req, res, next) {
        try {
            const result = await this.service.triggerReminders();
            res.json(new BaseResponseDto(result, 'Manual holiday reminders triggered successfully'));
        } catch (error) {
            next(error);
        }
    }
}
