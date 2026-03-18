import { AppDataSource } from '../database/data-source.js';
import { PayrollEntity } from '../models/entities/payroll.entity.js';

export class PayrollRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(PayrollEntity);
    }

    async findAll(options = {}) {
        const { skip = 0, take = 10, month, year, status, search } = options;

        const query = this.repository.createQueryBuilder('payroll')
            .where('payroll.isDeleted = :isDeleted', { isDeleted: false });

        if (month) query.andWhere('payroll.payrollMonth = :month', { month });
        if (year) query.andWhere('payroll.payrollYear = :year', { year });
        if (status) query.andWhere('payroll.payrollStatus = :status', { status });

        const [items, total] = await query
            .orderBy('payroll.payrollYear', 'DESC')
            .addOrderBy('payroll.payrollMonth', 'DESC')
            .skip(skip)
            .take(take)
            .getManyAndCount();

        return { items, total };
    }

    async findById(id) {
        return this.repository.findOne({
            where: { id, isDeleted: false },
        });
    }

    async findByPeriod(month, year) {
        return this.repository.findOne({
            where: { payrollMonth: month, payrollYear: year, isDeleted: false },
        });
    }

    async create(data) {
        const payroll = this.repository.create(data);
        return this.repository.save(payroll);
    }

    async update(id, data) {
        await this.repository.update(id, data);
        return this.findById(id);
    }

    async softDelete(id) {
        return this.repository.update(id, { isDeleted: true, deletedAt: new Date() });
    }
}
