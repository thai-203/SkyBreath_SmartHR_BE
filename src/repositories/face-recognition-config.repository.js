import { AppDataSource } from '../database/data-source.js';
import { FaceRecognitionConfigEntity } from '../models/entities/face-recognition-config.entity.js';

export class FaceRecognitionConfigRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(FaceRecognitionConfigEntity);
    }

    async findOneConfig() {
        // Try to find existing config (assume single row)
        const config = await this.repository.findOne({ where: { isDeleted: false } });
        return config;
    }

    async create(data) {
        const entity = this.repository.create(data);
        return this.repository.save(entity);
    }

    async update(id, data) {
        await this.repository.update(id, data);
        return this.findById(id);
    }

    async findById(id) {
        return this.repository.findOne({ where: { id, isDeleted: false } });
    }

    async upsert(data) {
        // If exists, update first found config, otherwise create
        const existing = await this.findOneConfig();
        if (existing) {
            await this.repository.update(existing.id, data);
            return this.findById(existing.id);
        }
        return this.create(data);
    }

    async resetToDefaults(defaults) {
        const existing = await this.findOneConfig();
        if (existing) {
            await this.repository.update(existing.id, defaults);
            return this.findById(existing.id);
        }
        return this.create(defaults);
    }
}
