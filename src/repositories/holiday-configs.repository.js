import { AppDataSource } from '../database/data-source.js';
import { HolidayConfigEntity } from '../models/entities/holiday-config.entity.js';

export class HolidayConfigRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(HolidayConfigEntity);
    }

    async getConfig() {
        let config = await this.repository.findOne({
            where: { isDeleted: false },
            order: { createdAt: 'DESC' }
        });
        
        if (!config) {
            config = this.repository.create({
                isPaidByDefault: false,
                compensatoryWorkingDaysEnabled: false
            });
            await this.repository.save(config);
        }
        
        return config;
    }

    async updateConfig(data) {
        let config = await this.getConfig();
        Object.assign(config, data);
        return this.repository.save(config);
    }
}
