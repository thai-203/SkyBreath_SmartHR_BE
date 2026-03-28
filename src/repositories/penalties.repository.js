import { AppDataSource } from '../database/data-source.js';
import { PenaltyEntity } from '../models/entities/penalty.entity.js';

export class PenaltiesRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(PenaltyEntity);
    }

    async findAll(options = {}) {
        const {
            skip = 0, take = 10,
            search, violationType, status,
        } = options;

        const query = this.repository.createQueryBuilder('penalty')
            .where('penalty.isDeleted = :isDeleted', { isDeleted: false });

        // Search by note
        if (search) {
            query.andWhere('penalty.note LIKE :search', { search: `%${search}%` });
        }

        // Filter by violationType
        if (violationType) {
            query.andWhere('penalty.violationType = :violationType', { violationType });
        }

        // Filter by status
        if (status) {
            query.andWhere('penalty.status = :status', { status });
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

    /**
     * Tìm các penalty có cùng violationType, effective date chồng chéo, và khoảng phút chồng chéo.
     * Xung đột = Cùng ViolationType + Ngày overlap + Khoảng phút overlap
     */
    async findOverlapping(violationType, effectiveFrom, effectiveTo, fromMinute, toMinute, excludeId = null) {
        const query = this.repository.createQueryBuilder('penalty')
            .where('penalty.isDeleted = false')
            .andWhere('penalty.violationType = :violationType', { violationType })
            .andWhere('penalty.status = :status', { status: 'ACTIVE' });

        // Check ngày overlap
        if (effectiveTo) {
            query.andWhere(
                '(penalty.effectiveFrom <= :effectiveTo AND (penalty.effectiveTo IS NULL OR penalty.effectiveTo >= :effectiveFrom))',
                { effectiveFrom, effectiveTo }
            );
        } else {
            query.andWhere(
                '(penalty.effectiveTo IS NULL OR penalty.effectiveTo >= :effectiveFrom)',
                { effectiveFrom }
            );
        }

        // Check khoảng phút overlap: newFrom < existTo AND existFrom < newTo
        query.andWhere(
            '(penalty.fromMinute < :toMinute AND penalty.toMinute > :fromMinute)',
            { fromMinute, toMinute }
        );

        if (excludeId) {
            query.andWhere('penalty.id != :excludeId', { excludeId });
        }

        return query.getMany();
    }
}
