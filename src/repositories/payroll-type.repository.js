import { AppDataSource } from '../database/data-source.js';
import { PayrollTypeEntity } from '../models/entities/payroll-type.entity.js';
import { Like } from 'typeorm';

export class PayrollTypeRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(PayrollTypeEntity);
    }

    async findAll(queryDto) {
        const { page, limit, search, departmentId } = queryDto;
        const skip = (page - 1) * limit;

        const where = {};
        if (search) {
            where.name = Like(`%${search}%`);
        }
        if (departmentId) {
            where.departmentId = departmentId;
        }

        const [items, total] = await this.repository.findAndCount({
            where,
            relations: ['department', 'position', 'creator'],
            skip,
            take: limit,
            order: { createdAt: 'DESC' },
        });

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findById(id) {
        return await this.repository.findOne({
            where: { id },
            relations: ['department', 'position', 'creator'],
        });
    }

    async findByCode(code) {
        return await this.repository.findOne({ where: { payrollTypeCode: code } });
    }

    async findByKeyword(keyword) {
        return await this.repository.findOne({ where: { keyword } });
    }

    async create(data) {
        const payrollType = this.repository.create(data);
        return await this.repository.save(payrollType);
    }

    async update(id, data) {
        await this.repository.update(id, data);
        return this.findById(id);
    }

    async delete(id) {
        return await this.repository.softDelete(id);
    }
}
