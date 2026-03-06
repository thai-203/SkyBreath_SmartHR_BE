import { Between, Like } from 'typeorm';
import { AppDataSource } from '../database/data-source.js';
import { HolidayListEntity } from '../models/entities/holiday-list.entity.js';

export class HolidayListRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(HolidayListEntity);
    }

    async create(data) {
        const holiday = this.repository.create(data);
        return this.repository.save(holiday);
    }

    async createMany(data) {
        const holidays = this.repository.create(data);
        return this.repository.save(holidays);
    }

    async findAll(queryDto = {}) {
        const { skip = 0, limit = 10, sortBy = 'startDate', sortOrder = 'ASC', search, startDate, endDate } = queryDto;

        const order = {};
        if (sortBy) {
            order[sortBy] = sortOrder;
        } else {
            order.startDate = 'ASC';
        }

        const where = {
            isDeleted: false,
        };

        if (search) {
            where.holidayName = Like(`%${search}%`);
        }

        if (startDate && endDate) {
            where.startDate = Between(startDate, endDate);
        } else if (startDate) {
            where.startDate = Like(`${startDate}%`);
        }

        const [items, total] = await this.repository.findAndCount({
            where,
            order,
            skip,
            take: limit,
        });

        return [items, total];
    }

    async findById(id) {
        return this.repository.findOne({
            where: { id, isDeleted: false },
        });
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

    async findByNameAndRange(name, startDate, endDate) {
        return this.repository.findOne({
            where: { holidayName: name, startDate, endDate, isDeleted: false },
        });
    }
}
