import { AppDataSource } from '../database/data-source.js';
import { RequestTypeEntity } from '../models/entities/request-type.entity.js';

export class RequestTypesRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(RequestTypeEntity);
    }

    async findAll(options = {}) {
        const { skip = 0, take = 10, search, status, requestGroupId } = options;

        const query = this.repository.createQueryBuilder('type')
            .leftJoinAndSelect('type.policy', 'policy')
            .where('type.isDeleted = :isDeleted', { isDeleted: false });

        if (search) {
            query.andWhere('type.name LIKE :search', { search: `%${search}%` });
        }

        if (status) {
            query.andWhere('type.status = :status', { status });
        }

        if (requestGroupId) {
            query.andWhere('type.requestGroupId = :requestGroupId', { requestGroupId });
        }

        const [types, total] = await query
            .orderBy('type.createdAt', 'DESC')
            .skip(skip)
            .take(take)
            .getManyAndCount();

        return { items: types, total };
    }

    async findById(id) {
        return await this.repository.findOne({
            where: { id, isDeleted: false },
            relations: ['policy', 'requestGroup'],
        });
    }

    async countByGroupId(groupId) {
        return await this.repository.count({
            where: { requestGroupId: groupId, isDeleted: false }
        });
    }

    async create(data) {
        const type = this.repository.create(data);
        return await this.repository.save(type);
    }

    async update(id, data) {
        await this.repository.update(id, data);
        return await this.findById(id);
    }

    async delete(id) {
        await this.repository.update(id, {
            isDeleted: true,
            deletedAt: new Date(),
        });
    }
}
