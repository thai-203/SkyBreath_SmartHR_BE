import { Between, Like, In } from 'typeorm';
import { AppDataSource } from '../database/data-source.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { HolidayListEntity } from '../models/entities/holiday-list.entity.js';

export class HolidayListRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(HolidayListEntity);
    }

    async create(data) {
        const { employeeIds, ...holidayData } = data;
        const holiday = this.repository.create(holidayData);
        
        if (employeeIds && employeeIds.length > 0) {
            const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
            holiday.employees = await employeeRepo.find({
                where: { id: In(employeeIds) }
            });
        }
        
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

        if (queryDto.holidayGroupId) {
            where.holidayGroupId = queryDto.holidayGroupId;
        }

        if (search) {
            where.holidayName = Like(`%${search}%`);
        }

        if (queryDto.holidayType) {
            where.holidayType = queryDto.holidayType;
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
            relations: ['employees']
        });
    }

    async update(id, data) {
        const { employeeIds, ...holidayData } = data;
        let holiday = await this.findById(id);
        
        if (!holiday) return null;

        // Update basic fields
        Object.assign(holiday, holidayData);

        if (employeeIds !== undefined) {
            if (employeeIds.length > 0) {
                const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
                holiday.employees = await employeeRepo.find({
                    where: { id: In(employeeIds) }
                });
            } else {
                holiday.employees = [];
            }
        }

        return this.repository.save(holiday);
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

    async findByStartDate(date) {
        return this.repository.find({
            where: { startDate: Like(`${date}%`), isDeleted: false }
        });
    }
}
