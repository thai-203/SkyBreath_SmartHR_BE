import { HolidayConfigRepository } from '../repositories/holiday-configs.repository.js';
import { HolidayListService } from './holiday-list.service.js';

export class HolidayConfigService {
    constructor() {
        this.repository = new HolidayConfigRepository();
        this.holidayListService = new HolidayListService();
    }

    async getConfig() {
        return this.repository.getConfig();
    }

    async updateConfig(data) {
        return this.repository.updateConfig(data);
    }

    async triggerReminders() {
        return this.holidayListService.processScheduledReminders();
    }
}
