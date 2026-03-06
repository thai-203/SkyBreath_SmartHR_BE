import { AppDataSource } from '../database/data-source.js';
import { PenaltyEntity } from '../models/entities/penalty.entity.js';

export class PenaltiesRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(PenaltyEntity);
    }

    async findAll(options = {}) {
        const {
            skip = 0, take = 10,
            search, penaltyType, severityLevel, status,
            minDeductionAmount, maxDeductionAmount,
        } = options;

        const query = this.repository.createQueryBuilder('penalty')
            .select([
                'penalty.id',
                'penalty.name',
                'penalty.penaltyType',
                'penalty.severityLevel',
                'penalty.deductionAmount',
                'penalty.deductionPercentage',
                'penalty.description',
                'penalty.status',
                'penalty.createdAt',
                'penalty.updatedAt',
            ])
            .where('penalty.isDeleted = :isDeleted', { isDeleted: false });

        // Search by name or deductionAmount
        if (search) {
            const searchNum = parseFloat(search);
            if (!isNaN(searchNum)) {
                query.andWhere(
                    '(penalty.name LIKE :search OR penalty.deductionAmount = :searchNum)',
                    { search: `%${search}%`, searchNum }
                );
            } else {
                query.andWhere('penalty.name LIKE :search', { search: `%${search}%` });
            }
        }

        // Filter by penaltyType
        if (penaltyType) {
            query.andWhere('penalty.penaltyType = :penaltyType', { penaltyType });
        }

        // Filter by severityLevel
        if (severityLevel) {
            query.andWhere('penalty.severityLevel = :severityLevel', { severityLevel });
        }

        // Filter by status
        if (status) {
            query.andWhere('penalty.status = :status', { status });
        }

        // Filter by deductionAmount range
        if (minDeductionAmount !== undefined) {
            query.andWhere('penalty.deductionAmount >= :minDeductionAmount', { minDeductionAmount });
        }
        if (maxDeductionAmount !== undefined) {
            query.andWhere('penalty.deductionAmount <= :maxDeductionAmount', { maxDeductionAmount });
        }

        const [items, total] = await query
            .orderBy('penalty.createdAt', 'DESC')
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

    async create(data) {
        const penalty = this.repository.create(data);
        return this.repository.save(penalty);
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
}
