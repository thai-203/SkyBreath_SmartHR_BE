import { AppDataSource } from '../database/data-source.js';
import { PerformanceReviewEntity } from '../models/entities/performance-review.entity.js';
import { In } from 'typeorm';

export class PerformanceReviewsRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(PerformanceReviewEntity);
    }

    async findAll(options = {}) {
        const {
            skip = 0,
            take = 10,
            search = '',
            month,
            year,
            employeeId,
            managerId,
        } = options;

        const query = this.repository
            .createQueryBuilder('review')
            .leftJoinAndSelect('review.employee', 'employee')
            .leftJoinAndSelect('employee.department', 'department')
            .leftJoinAndSelect('employee.position', 'position')
            .leftJoinAndSelect('review.manager', 'manager')
            .where('review.isDeleted = :isDeleted', { isDeleted: false });

        if (search) {
            query.andWhere(
                '(employee.fullName LIKE :search OR employee.employeeCode LIKE :search)',
                { search: `%${search}%` },
            );
        }

        if (month) {
            query.andWhere('review.reviewMonth = :month', { month });
        }

        if (year) {
            query.andWhere('review.reviewYear = :year', { year });
        }

        if (employeeId) {
            query.andWhere('review.employeeId = :employeeId', { employeeId });
        }

        if (managerId) {
            query.andWhere('review.managerId = :managerId', { managerId });
        }

        const [items, total] = await query
            .orderBy('review.reviewYear', 'DESC')
            .addOrderBy('review.reviewMonth', 'DESC')
            .addOrderBy('employee.fullName', 'ASC')
            .skip(skip)
            .take(take)
            .getManyAndCount();

        return { items, total };
    }

    async findById(id) {
        return this.repository.findOne({
            where: { id, isDeleted: false },
            relations: [
                'employee',
                'employee.department',
                'employee.position',
                'manager',
            ],
        });
    }

    async findByEmployeeAndPeriod(employeeId, month, year, excludeId = null) {
        const query = this.repository
            .createQueryBuilder('review')
            .where('review.employeeId = :employeeId', { employeeId })
            .andWhere('review.reviewMonth = :month', { month })
            .andWhere('review.reviewYear = :year', { year })
            .andWhere('review.isDeleted = :isDeleted', { isDeleted: false });

        if (excludeId) {
            query.andWhere('review.id != :excludeId', { excludeId });
        }

        return query.getOne();
    }

    async findByManagerId(managerId, month = null, year = null) {
        const query = this.repository
            .createQueryBuilder('review')
            .leftJoinAndSelect('review.employee', 'employee')
            .where('review.managerId = :managerId', { managerId })
            .andWhere('review.isDeleted = :isDeleted', { isDeleted: false });

        if (month) {
            query.andWhere('review.reviewMonth = :month', { month });
        }

        if (year) {
            query.andWhere('review.reviewYear = :year', { year });
        }

        return query.getMany();
    }

    async create(data) {
        const review = this.repository.create(data);
        return this.repository.save(review);
    }

    async update(id, data) {
        await this.repository.update(id, data);
        return this.findById(id);
    }

    async softDelete(id) {
        return this.repository.update(id, {
            isDeleted: true,
            deletedAt: new Date(),
        });
    }
}
