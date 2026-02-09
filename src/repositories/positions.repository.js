import { AppDataSource } from '../database/data-source.js';
import { PositionEntity } from '../models/entities/position.entity.js';
import { Like } from 'typeorm';

export class PositionsRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(PositionEntity);
    }

    async findAll() {
        return this.repository.find({
            where: { isDeleted: false },
            order: { createdAt: 'DESC' },
        });
    }

    async findById(id) {
        return this.repository.findOne({
            where: { id, isDeleted: false },
        });
    }

    async create(data) {
        const position = this.repository.create(data);
        return this.repository.save(position);
    }

    async update(id, data) {
        await this.repository.update(id, data);
        return this.findById(id);
    }

    async delete(id) {
        await this.repository.update(id, {
            isDeleted: true,
            deletedAt: new Date(),
        });
    }

    async findList() {
        return this.repository.find({
            select: ['id', 'positionName'],
            where: { isDeleted: false },
            order: { positionName: 'ASC' },
        });
    }
}
