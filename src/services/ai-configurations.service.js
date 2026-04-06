import { AppDataSource } from '../database/data-source.js';
import { AiConfigurationEntity } from '../models/entities/ai-configuration.entity.js';

export class AiConfigurationsService {
    constructor() {
        this.repo = AppDataSource.getRepository(AiConfigurationEntity);
    }

    async getActiveConfig() {
        return await this.repo.findOne({ where: { status: 'ACTIVE' } });
    }

    async getAll() {
        const configs = await this.repo.find({
            order: { createdAt: 'DESC' },
            relations: ['creator', 'updater']
        });
        
        return configs.map(c => ({
            ...c,
            creatorName: c.creator?.fullName,
            updaterName: c.updater?.fullName
        }));
    }

    async create(data, userId) {
        // Enforce 1 ACTIVE logic
        if (data.status === 'ACTIVE') {
            const activeConfig = await this.getActiveConfig();
            if (activeConfig) {
                throw new Error('Đã có một cấu hình AI đang ở trạng thái ACTIVE. Vui lòng tắt cấu hình cũ trước khi bật cấu hình mới.');
            }
        }
        
        // Also check unique configKey
        const existing = await this.repo.findOne({ where: { configKey: data.configKey } });
        if (existing) {
             throw new Error('Key cấu hình này đã tồn tại.');
        }

        const newConfig = this.repo.create({
            ...data,
            createdBy: userId,
        });

        return await this.repo.save(newConfig);
    }

    async update(id, data, userId) {
        const config = await this.repo.findOne({ where: { id } });
        if (!config) throw new Error('Cấu hình không tồn tại.');

        if (data.status === 'ACTIVE' && config.status !== 'ACTIVE') {
             const activeConfig = await this.getActiveConfig();
             if (activeConfig && activeConfig.id !== Number(id)) {
                 throw new Error('Đã có một cấu hình AI khác đang ở trạng thái ACTIVE. Vui lòng tắt cấu hình cũ trước.');
             }
        }

        if (data.configKey && data.configKey !== config.configKey) {
            const existing = await this.repo.findOne({ where: { configKey: data.configKey } });
            if (existing) {
                 throw new Error('Key cấu hình này đã tồn tại.');
            }
        }

        Object.assign(config, data);
        config.updatedBy = userId;
        return await this.repo.save(config);
    }

    async delete(id) {
        const config = await this.repo.findOne({ where: { id } });
        if (!config) throw new Error('Cấu hình không tồn tại.');
        
        // Hard delete
        await this.repo.delete(id);
    }
}
