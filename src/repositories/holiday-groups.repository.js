import { AppDataSource } from '../database/data-source.js';
import { HolidayGroupEntity } from '../models/entities/holiday-group.entity.js';

export class HolidayGroupRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(HolidayGroupEntity);
    }

    async create(data) {
        const group = this.repository.create(data);
        return this.repository.save(group);
    }

    async findAll(query = {}) {
        const { year, status } = query;
        const where = { isDeleted: false };
        if (year) where.year = year;
        if (status) where.status = status;

        return this.repository.find({
            where,
            order: { year: 'DESC', groupName: 'ASC' },
            relations: ['holidays']
        });
    }

    async findByCode(code) {
        return this.repository.findOne({
            where: { groupCode: code, isDeleted: false }
        });
    }

    async findByYearAndScope(year, scope) {
        return this.repository.findOne({
            where: { year, applicableScope: scope, status: 'ACTIVE', isDeleted: false }
        });
    }

    async findByNameYearScope(name, year, scope) {
        return this.repository.findOne({
            where: { groupName: name, year, applicableScope: scope, isDeleted: false }
        });
    }

    async findById(id) {
        return this.repository.findOne({
            where: { id, isDeleted: false },
            relations: ['holidays']
        });
    }

    async update(id, data) {
        await this.repository.update(id, data);
        return this.findById(id);
    }

    async delete(id) {
        await this.repository.update(id, {
            isDeleted: true,
            deletedAt: new Date()
        });
    }
}
