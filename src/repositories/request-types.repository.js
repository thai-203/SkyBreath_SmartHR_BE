import { AppDataSource } from '../database/data-source.js';
import { RequestTypeEntity } from '../models/entities/request-type.entity.js';

export class RequestTypesRepository {
    constructor() {}

    get repository() {
        if (!this._repository) this._repository = AppDataSource.getRepository(RequestTypeEntity);
        return this._repository;
    }

    async findAll(paginationDto = {}) {
        const { skip = 0, limit = 10, search, status, requestGroupId, includeDeleted = false } = paginationDto;

        const query = this.repository.createQueryBuilder('type')
            .withDeleted() // MUST because of @DeleteDateColumn
            .leftJoinAndSelect('type.policy', 'policy')
            .leftJoinAndSelect('type.requestGroup', 'requestGroup');

        if (!includeDeleted) {
            query.where('type.isDeleted = :isDeleted', { isDeleted: false });
        }

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
            .orderBy('type.isDeleted', 'ASC')
            .addOrderBy('type.createdAt', 'DESC')
            .skip(skip)
            .take(limit)
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

    async findByNameAndGroup(name, requestGroupId, excludeId = null) {
        const query = this.repository.createQueryBuilder('type')
            .where('type.name = :name', { name })
            .andWhere('type.requestGroupId = :requestGroupId', { requestGroupId })
            .andWhere('type.isDeleted = :isDeleted', { isDeleted: false });

        if (excludeId) {
            query.andWhere('type.id != :excludeId', { excludeId });
        }

        return await query.getOne();
    }

    async findByNameAndGroupWithDeleted(name, requestGroupId) {
        return await this.repository.createQueryBuilder('type')
            .withDeleted()
            .where('type.name = :name', { name })
            .andWhere('type.requestGroupId = :requestGroupId', { requestGroupId })
            .getOne();
    }

    async findByIdWithDeleted(id) {
        return await this.repository.createQueryBuilder('type')
            .withDeleted()
            .where('type.id = :id', { id })
            .getOne();
    }

    async update(id, data) {
        await this.repository.update(id, data);
        return await this.findById(id);
    }

    async delete(id) {
        await this.repository.update(id, {
            isDeleted: true,
            deletedAt: new Date(),
            status: 'INACTIVE',
        });
    }
}
